const axios = require('axios');
const { CHAINS, getProviderConfigForChain, getProviderKeyForChain, buildProviderRequest } = require('../config/chains');
const { mapWithConcurrency } = require('../utils/concurrency');
const { respondUpstreamFailure } = require('../utils/apiUtils');
const { cache } = require('../utils/cache');

const BZR_ADDRESS = process.env.BZR_TOKEN_ADDRESS;
const MAX_CONCURRENT_REQUESTS = Number(process.env.ETHERSCAN_CONCURRENCY || 3);
const HOLDER_RETRY_ATTEMPTS = Number(process.env.STATS_HOLDER_RETRY_ATTEMPTS || 3);
const HOLDER_RETRY_DELAY_MS = Number(process.env.STATS_HOLDER_RETRY_DELAY_MS || 2000);
const HOLDER_MAX_FAILURE_STICKY = Number(process.env.STATS_HOLDER_MAX_FAILURE_STICKY || 3);
const TWO_MINUTES = 2 * 60 * 1000;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const isRetryable = (error) => {
  const message = (error?.message || '').toLowerCase();
  return (
    message.includes('notok') ||
    message.includes('rate limit') ||
    message.includes('busy') ||
    message.includes('timeout') ||
    message.includes('429') ||
    error.code === 'ECONNABORTED'
  );
};

const fetchStatsForChainOnce = async (chain) => {
  if (getProviderKeyForChain(chain) === 'cronos') {
    console.warn('! Cronos tokenholdercount endpoint unavailable – defaulting to 0');
    return { chainName: chain.name, chainId: chain.id, holderCount: 0, unsupported: true };
  }

  const { provider, params } = buildProviderRequest(chain, {
    module: 'token',
    action: 'tokenholdercount',
    contractaddress: BZR_ADDRESS,
  });

  try {
    const response = await axios.get(provider.baseUrl, { params });
    if (response.data.status === '1') {
      return {
        chainName: chain.name,
        chainId: chain.id,
        holderCount: parseInt(response.data.result, 10),
      };
    }

    const errorMessage = response.data?.message || response.data?.result || 'Tokenholdercount returned status 0';
    const error = new Error(errorMessage);
    error.code = 'TOKEN_HOLDERCOUNT_STATUS_0';
    error.payload = response.data;
    throw error;
  } catch (error) {
    console.error(`X Failed to fetch stats for chain ${chain.name}: ${error.message}`);
    if (error.response?.data) {
      const wrapped = new Error(error.message || 'Failed to fetch tokenholdercount');
      wrapped.code = 'TOKEN_HOLDERCOUNT_HTTP_ERROR';
      wrapped.payload = error.response.data;
      throw wrapped;
    }
    throw error;
  }
};

const fetchStatsForChainWithRetry = async (chain) => {
  let attempt = 1;
  while (attempt <= HOLDER_RETRY_ATTEMPTS) {
    try {
      return await fetchStatsForChainOnce(chain);
    } catch (error) {
      const retryable = isRetryable(error);
      if (!retryable || attempt === HOLDER_RETRY_ATTEMPTS) {
        throw error;
      }
      const delay = HOLDER_RETRY_DELAY_MS * attempt;
      console.warn(`! Holder fetch retry ${attempt}/${HOLDER_RETRY_ATTEMPTS} for ${chain.name} in ${delay}ms (${error.message})`);
      await sleep(delay);
      attempt += 1;
    }
  }
  throw new Error(`Exhausted retries for chain ${chain.name}`);
};

const fetchStatsForChainWithStickyCache = async (chain) => {
  try {
    const result = await fetchStatsForChainWithRetry(chain);
    cache.statsChains.set(chain.id, { holderCount: result.holderCount, timestamp: Date.now() });
    cache.statsFailureCounts.set(chain.id, 0);
    return result;
  } catch (error) {
    const prev = cache.statsChains.get(chain.id);
    const failures = (cache.statsFailureCounts.get(chain.id) || 0) + 1;
    cache.statsFailureCounts.set(chain.id, failures);

    if (prev && failures < HOLDER_MAX_FAILURE_STICKY) {
      console.warn(`! Holder fetch failed for ${chain.name} (failure ${failures}); using sticky cache value ${prev.holderCount}`);
      return {
        chainName: chain.name,
        chainId: chain.id,
        holderCount: prev.holderCount,
        sticky: true,
      };
    }

    console.warn(`! Holder fetch failed for ${chain.name} after ${failures} failures; returning 0`);
    return { chainName: chain.name, chainId: chain.id, holderCount: 0, failed: true };
  }
};

// Exported for legacy use; uses sticky cache and retry logic.
const fetchStatsForChain = async (chain) => fetchStatsForChainWithStickyCache(chain);

const getAggregatedStats = async () => {
  const now = Date.now();
  if (cache.stats && (now - cache.statsTimestamp < TWO_MINUTES)) {
    console.log('-> Returning cached /api/stats data.');
    return cache.stats;
  }

  console.log('-> Fetching new /api/stats data from 10 chains with retries and sticky cache...');
  try {
    const allResults = await mapWithConcurrency(
      CHAINS,
      MAX_CONCURRENT_REQUESTS,
      (chain) => fetchStatsForChainWithStickyCache(chain)
    );
    let allStats = [];
    let totalHolders = 0; // We'll sum this up for a total count

    allResults.forEach((result, index) => {
      if (result) {
        allStats.push(result);
        totalHolders += result.holderCount;
      } else {
        console.warn(`! Failed to fetch stats for chain ${CHAINS[index].name} (returned null)`);
      }
    });

    // Sort by holder count, descending
    allStats.sort((a, b) => b.holderCount - a.holderCount);

    const response = {
      totalHolders,
      chains: allStats,
    };

    console.log(`-> Aggregated stats. Total holders (estimated): ${totalHolders}.`);
    
    // If we got 0 or suspiciously low holders and we have cached data, keep the cache
    if (totalHolders < 100 && cache.stats && cache.stats.totalHolders > totalHolders) {
      console.warn(`! Stats returned ${totalHolders} holders but cache has ${cache.stats.totalHolders}. Keeping cached data due to likely API failures.`);
      // Extend cache time by 2 more minutes to avoid hammering failing APIs
      cache.statsTimestamp = Date.now();
      return cache.stats;
    }
    
    cache.stats = response;
    cache.statsTimestamp = Date.now();
    return response;
  } catch (error) {
    console.error('Error in getAggregatedStats:', error.message);
    throw error;
  }
};

module.exports = {
  fetchStatsForChain,
  getAggregatedStats,
};
