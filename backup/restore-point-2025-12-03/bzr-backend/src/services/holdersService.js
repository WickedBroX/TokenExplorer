const axios = require('axios');
const { 
  CHAINS, 
  getChainDefinition, 
  getProviderConfigForChain, 
  getProviderKeyForChain 
} = require('../config/chains');
const { getNextApiKey } = require('../utils/apiUtils');

const BZR_ADDRESS = process.env.BZR_TOKEN_ADDRESS;
const DUST_THRESHOLD = 1e-6; // 0.000001 BZR

const fetchHolders = async ({ chainId, page = 1, pageSize = 50 }) => {
  if (!BZR_ADDRESS) {
    throw new Error('Server missing BZR_TOKEN_ADDRESS');
  }

  const chain = getChainDefinition(chainId);
  if (!chain) {
    const error = new Error('Invalid chain ID');
    error.code = 'INVALID_CHAIN_ID';
    error.availableChains = CHAINS;
    throw error;
  }

  // Cronos doesn't support tokenholderlist
  if (getProviderKeyForChain(chain) === 'cronos') {
    const error = new Error('Cronos chain does not support token holder list');
    error.code = 'NOT_SUPPORTED';
    error.chainName = chain.name;
    throw error;
  }

  try {
    const provider = getProviderConfigForChain(chain);
    const apiKey = provider.key === 'etherscan' ? getNextApiKey() : provider.apiKey;

    const response = await axios.get(provider.baseUrl, {
      params: {
        chainid: chain.id,
        apikey: apiKey,
        module: 'token',
        action: 'tokenholderlist',
        contractaddress: BZR_ADDRESS,
        page,
        offset: pageSize,
      },
      timeout: 30000,
    });

    if (response.data.status !== '1') {
      console.error(`X Etherscan tokenholderlist error for ${chain.name}:`, response.data.message);
      const error = new Error(response.data.message || 'Failed to fetch holders from Etherscan');
      error.code = 'UPSTREAM_ERROR';
      error.upstreamResponse = response.data;
      throw error;
    }


    const rawHolders = Array.isArray(response.data.result) ? response.data.result : [];

    // Filter out zero-balance and dust holders to better match what we display in the UI
    // Etherscan can return extremely small balances (a few wei) which show up as 0 BZR in the app.
    const filteredHolders = rawHolders.filter((holder) => {
      const raw = parseFloat(holder.TokenHolderQuantity || '0');
      if (!Number.isFinite(raw) || raw <= 0) return false;
      const bzr = raw / Math.pow(10, 18);
      return bzr >= DUST_THRESHOLD;
    });

    console.log(`-> Fetched ${rawHolders.length} holders for ${chain.name} (page ${page}). Filtered out ${rawHolders.length - filteredHolders.length} dust accounts (< ${DUST_THRESHOLD} BZR). Remaining: ${filteredHolders.length}`);
    
    // Inject chain info into each holder for consistency with aggregated results
    const holdersWithChainInfo = filteredHolders.map(holder => ({
      ...holder,
      chainId: chain.id,
      chainName: chain.name,
    }));

    return {
      data: holdersWithChainInfo,
      chain: {
        id: chain.id,
        name: chain.name,
      },
      pagination: {
        page,
        pageSize,
        resultCount: filteredHolders.length,
        totalRaw: rawHolders.length,
      },
      timestamp: Date.now(),
    };
  } catch (error) {
    console.error(`Error fetching holders for ${chain.name}:`, error.message);
    throw error;
  }
};

const fetchAggregatedHolders = async ({ page = 1, pageSize = 50 }) => {
  // 1. Identify supported chains (exclude Cronos as it doesn't support holder list)
  const supportedChains = CHAINS.filter(chain => getProviderKeyForChain(chain) !== 'cronos');

  console.log(`-> Fetching aggregated holders from ${supportedChains.length} chains...`);

  // 2. Fetch top holders from all chains concurrently
  // We fetch a larger page size (e.g. 100) from each chain to ensure we have enough data to sort globally
  // for the first few pages. Deep pagination is imperfect with this method but sufficient for "Top Holders".
  const fetchPromises = supportedChains.map(chain => 
    fetchHolders({ chainId: chain.id, page: 1, pageSize: 100 })
      .then(result => ({ status: 'fulfilled', value: result.data, chainId: chain.id, chainName: chain.name }))
      .catch(error => {
        console.warn(`! Failed to fetch holders from ${chain.name}: ${error.message}`);
        return { status: 'rejected', reason: error };
      })
  );

  const results = await Promise.all(fetchPromises);

  // 3. Merge all holders
  let allHolders = [];
  results.forEach(result => {
    if (result.status === 'fulfilled' && Array.isArray(result.value)) {
      // Inject chain info into each holder
      const holdersWithChain = result.value.map(holder => ({
        ...holder,
        chainId: result.chainId,
        chainName: result.chainName,
      }));
      allHolders = allHolders.concat(holdersWithChain);
    }
  });

  // 4. Sort by balance (descending)
  allHolders.sort((a, b) => {
    const balanceA = parseFloat(a.TokenHolderQuantity);
    const balanceB = parseFloat(b.TokenHolderQuantity);
    return balanceB - balanceA;
  });

  // 5. Paginate
  const startIndex = (page - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedHolders = allHolders.slice(startIndex, endIndex);

  return {
    data: paginatedHolders,
    chain: {
      id: 0,
      name: 'All Chains',
    },
    pagination: {
      page,
      pageSize,
      resultCount: paginatedHolders.length,
      totalRaw: allHolders.length, // This is the total we fetched, not true global total
    },
    timestamp: Date.now(),
  };
};

module.exports = {
  fetchHolders,
  fetchAggregatedHolders,
};
