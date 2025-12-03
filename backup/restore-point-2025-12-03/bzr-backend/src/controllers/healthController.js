const healthService = require('../services/healthService');
const tokenService = require('../services/tokenService');
const transfersService = require('../services/transfersService');
const { cache, getCachedTransfersWarmSummary } = require('../utils/cache');
const persistentStore = require('../persistentStore');

const TWO_MINUTES = 2 * 60 * 1000;
const FIVE_MINUTES = 5 * 60 * 1000;
const TOKEN_PRICE_TTL_MS = 60 * 1000;
const FINALITY_TTL_MS = 15 * 1000;
const BZR_ADDRESS = process.env.BZR_TOKEN_ADDRESS;
const CACHE_WARM_INTERVAL_MS = Number(process.env.CACHE_WARM_INTERVAL_MS || 0);

const getHealth = async (req, res) => {
  const health = await healthService.getSystemHealth();
  res.json(health);
};

const getCacheHealth = async (req, res) => {
  const now = Date.now();

  const withMeta = (data, timestamp, ttl) => {
    if (!data || !timestamp) {
      return {
        status: 'empty',
        ageMs: null,
        ttlMs: ttl,
        expiresInMs: null,
      };
    }
    const age = now - timestamp;
    return {
      status: age < ttl ? 'fresh' : 'stale',
      ageMs: age,
      ttlMs: ttl,
      expiresInMs: Math.max(ttl - age, 0),
    };
  };

  const transfersWarmMeta = withMeta(cache.transfersWarmStatus, cache.transfersWarmTimestamp, TWO_MINUTES);
  const warmSummary = getCachedTransfersWarmSummary();
  const persistentWarmSummary = await healthService.getPersistentWarmSummary();

  let persistentStatus = {
    enabled: persistentStore.isPersistentStoreEnabled(),
    ready: persistentStore.isPersistentStoreReady(),
    summary: [],
    reason: null,
    error: null,
  };

  try {
    const status = await persistentStore.getPersistentStoreStatus();
    if (status) {
      persistentStatus = {
        enabled: Boolean(status.enabled),
        ready: Boolean(status.ready),
        summary: Array.isArray(status.summary) ? status.summary : [],
        reason: status.reason || null,
        error: null,
      };
    }
  } catch (error) {
    persistentStatus.error = error.message || String(error);
  }
  
  const persistentStoreInitError = persistentStore.getPersistentStoreError();
  if (!persistentStatus.ready && persistentStoreInitError) {
    persistentStatus.error = persistentStatus.error || persistentStoreInitError.message;
  }

  res.json({
    info: withMeta(cache.info, cache.infoTimestamp, FIVE_MINUTES),
    transfersWarm: {
      ...transfersWarmMeta,
      chains: warmSummary.chains,
      timestamp: warmSummary.timestamp,
      refreshInFlight: transfersService.isTransfersRefreshInFlight(),
    },
    transferWarmChains: cache.transfersWarmStatus,
    stats: withMeta(cache.stats, cache.statsTimestamp, TWO_MINUTES),
    tokenPrice: {
      ...withMeta(cache.tokenPrice, cache.tokenPriceTimestamp, TOKEN_PRICE_TTL_MS),
      proRequired: cache.tokenPrice?.proRequired || false,
      available: cache.tokenPrice?.available || false,
      priceUsd: typeof cache.tokenPrice?.priceUsd === 'number' ? cache.tokenPrice.priceUsd : null,
      priceUsdRaw: cache.tokenPrice?.priceUsdRaw ?? null,
    },
    finality: {
      ...withMeta(cache.finality, cache.finalityTimestamp, FINALITY_TTL_MS),
      blockNumber: cache.finality?.blockNumber ?? null,
      blockNumberHex: cache.finality?.blockNumberHex ?? null,
    },
    transfersCache: {
      pageEntries: cache.transfersPageCache.size,
      totalEntries: cache.transfersTotalCache.size,
    },
    inflight: {
      warmRefresh: transfersService.isTransfersRefreshInFlight(),
    },
    persistentStore: {
      ...persistentStatus,
      initialized: persistentStore.isPersistentStoreReady(),
      initError: persistentStoreInitError ? persistentStoreInitError.message : null,
      warm: persistentWarmSummary,
    },
    ingestion: {
      managedBy: 'bzr-ingester',
      enabled: persistentStatus.ready,
      note: 'Ingestion is supervised by the external bzr-ingester service.',
    },
    serverTime: new Date(now).toISOString(),
  });
};

const getTokenPrice = async (req, res) => {
  const now = Date.now();
  if (cache.tokenPrice && (now - cache.tokenPriceTimestamp) < TOKEN_PRICE_TTL_MS) {
    return res.json(cache.tokenPrice);
  }

  try {
    const payload = await tokenService.fetchTokenPrice();
    cache.tokenPrice = payload;
    cache.tokenPriceTimestamp = payload.timestamp;
    res.json(payload);
  } catch (error) {
    res.status(500).json({
      message: 'Failed to fetch token price',
      error: error.message || String(error),
    });
  }
};

const getFinality = async (req, res) => {
  const now = Date.now();
  if (cache.finality && (now - cache.finalityTimestamp) < FINALITY_TTL_MS) {
    return res.json(cache.finality);
  }

  try {
    const payload = await healthService.fetchFinalizedBlock();
    cache.finality = payload;
    cache.finalityTimestamp = payload.timestamp;
    res.json(payload);
  } catch (error) {
    res.status(500).json({
      message: 'Failed to fetch finalized block',
      error: error.message || String(error),
    });
  }
};

const invalidateCache = (req, res) => {
  console.log(`[${new Date().toISOString()}] Cache invalidation requested`);
  
  // Clear all caches
  cache.info = null;
  cache.infoTimestamp = 0;
  cache.stats = null;
  cache.statsTimestamp = 0;
  cache.tokenPrice = null;
  cache.tokenPriceTimestamp = 0;
  cache.finality = null;
  cache.finalityTimestamp = 0;
  
  // Clear transfers caches
  cache.transfersPageCache.clear();
  cache.transfersTotalCache.clear();
  cache.transfersWarmStatus = [];
  cache.transfersWarmTimestamp = null;
  
  console.log('-> All caches cleared successfully');
  console.log(`-> Current BZR Token Address: ${BZR_ADDRESS}`);
  
  // Trigger immediate cache warm
  if (CACHE_WARM_INTERVAL_MS > 0) {
    console.log('-> Triggering immediate cache warm...');
    transfersService.triggerTransfersRefresh({ forceRefresh: true }).catch((error) => {
      console.error('X Cache warm after invalidation failed:', error.message || error);
    });
  }
  
  res.json({
    message: 'All caches invalidated successfully',
    tokenAddress: BZR_ADDRESS,
    timestamp: Date.now(),
  });
};

module.exports = {
  getHealth,
  getCacheHealth,
  getTokenPrice,
  getFinality,
  invalidateCache,
};
