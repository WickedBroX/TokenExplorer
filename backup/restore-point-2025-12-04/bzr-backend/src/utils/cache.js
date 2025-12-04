const NodeCache = require('node-cache');

// --- Cache Setup ---
const apiCache = new NodeCache({ stdTTL: 60, checkperiod: 120 }); // Default 60s TTL for new caching

const TWO_MINUTES = 2 * 60 * 1000;
const TRANSFERS_PAGE_TTL_MS = Number(process.env.TRANSFERS_PAGE_TTL_MS || TWO_MINUTES);
const TRANSFERS_TOTAL_TTL_MS = Number(process.env.TRANSFERS_TOTAL_TTL_MS || 15 * 60 * 1000);

const cache = {
  transfersPageCache: new Map(),
  transfersTotalCache: new Map(),
  transfersWarmStatus: [],
  transfersWarmTimestamp: 0,
  stats: null,
  statsTimestamp: 0,
  statsChains: new Map(), // per-chain holder cache
  statsFailureCounts: new Map(), // per-chain consecutive failure counter
};

const buildTransfersTotalCacheKey = ({ chainId, startBlock, endBlock }) => {
  return [
    chainId,
    typeof startBlock === 'number' ? startBlock : '',
    typeof endBlock === 'number' ? endBlock : '',
  ].join('|');
};

const buildTransfersPageCacheKey = ({ chainId, page, pageSize, sort, startBlock, endBlock }) => {
  return [
    chainId,
    page,
    pageSize,
    sort,
    typeof startBlock === 'number' ? startBlock : '',
    typeof endBlock === 'number' ? endBlock : '',
  ].join('|');
};

const getCachedTransfersTotal = (key) => {
  const entry = cache.transfersTotalCache.get(key);
  if (!entry) {
    return null;
  }

  const age = Date.now() - entry.timestamp;
  return {
    payload: entry.payload,
    timestamp: entry.timestamp,
    age,
    stale: age > TRANSFERS_TOTAL_TTL_MS,
  };
};

const setCachedTransfersTotal = (key, payload) => {
  cache.transfersTotalCache.set(key, {
    timestamp: Date.now(),
    payload,
  });
};

const getCachedTransfersPage = (key) => {
  const entry = cache.transfersPageCache.get(key);
  if (!entry) {
    return null;
  }

  const age = Date.now() - entry.timestamp;
  return {
    payload: entry.payload,
    timestamp: entry.timestamp,
    age,
    stale: age > TRANSFERS_PAGE_TTL_MS,
  };
};

const setCachedTransfersPage = (key, payload) => {
  cache.transfersPageCache.set(key, {
    timestamp: Date.now(),
    payload,
  });
};

const getCachedTransfersWarmSummary = () => {
  return {
    chains: Array.isArray(cache.transfersWarmStatus) ? cache.transfersWarmStatus : [],
    timestamp: cache.transfersWarmTimestamp || null,
  };
};

module.exports = {
  apiCache,
  cache,
  buildTransfersTotalCacheKey,
  buildTransfersPageCacheKey,
  getCachedTransfersTotal,
  setCachedTransfersTotal,
  getCachedTransfersPage,
  setCachedTransfersPage,
  getCachedTransfersWarmSummary,
};
