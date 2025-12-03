const axios = require('axios');
const persistentStore = require('../persistentStore');
const { 
  CHAINS, 
  getChainDefinition, 
  getProviderConfigForChain, 
  getProviderKeyForChain, 
  buildProviderRequest,
  TRANSFERS_DEFAULT_CHAIN_ID 
} = require('../config/chains');
const {
  cache,
  buildTransfersTotalCacheKey,
  buildTransfersPageCacheKey,
  getCachedTransfersTotal,
  setCachedTransfersTotal,
  getCachedTransfersPage,
  setCachedTransfersPage,
  getCachedTransfersWarmSummary,
} = require('../utils/cache');
const { mapWithConcurrency } = require('../utils/concurrency');
const {
  fetchTransfersTotalCount,
  fetchTransfersPageFromChain,
} = require('../providers/transfersProvider');

const MAX_CONCURRENT_REQUESTS = Number(process.env.ETHERSCAN_CONCURRENCY || 3);

const transfersPagePromises = new Map();
const transfersTotalPromises = new Map();

const fetchTransfersTotal = async ({ chain, sort, startBlock, endBlock, cacheKey }) => {
  const key = cacheKey || buildTransfersTotalCacheKey({
    chainId: chain.id,
    startBlock,
    endBlock,
  });

  let promise = transfersTotalPromises.get(key);
  if (!promise) {
    promise = fetchTransfersTotalCount({
      chain,
      sort,
      startBlock,
      endBlock,
    })
      .then((result) => {
        setCachedTransfersTotal(key, result);
        return result;
      })
      .finally(() => {
        transfersTotalPromises.delete(key);
      });

    transfersTotalPromises.set(key, promise);
  }

  return promise;
};

const resolveTransfersTotalData = async ({
  chain,
  sort,
  startBlock,
  endBlock,
  forceRefresh = false,
}) => {
  const cacheKey = buildTransfersTotalCacheKey({
    chainId: chain.id,
    startBlock,
    endBlock,
  });

  if (forceRefresh) {
    cache.transfersTotalCache.delete(cacheKey);
    transfersTotalPromises.delete(cacheKey);
  }

  const cached = forceRefresh ? null : getCachedTransfersTotal(cacheKey);
  if (cached && !cached.stale && cached.payload) {
    return {
      ...cached.payload,
      cacheTimestamp: cached.timestamp,
      stale: false,
      source: 'cache',
    };
  }

  try {
    const fresh = await fetchTransfersTotal({
      chain,
      sort,
      startBlock,
      endBlock,
      cacheKey,
    });

    return {
      ...fresh,
      cacheTimestamp: fresh.timestamp,
      stale: false,
      source: 'network',
    };
  } catch (error) {
    if (cached?.payload) {
      console.warn(`! Returning stale transfers total for chain ${chain.name}: ${error.message || error}`);
      return {
        ...cached.payload,
        cacheTimestamp: cached.timestamp,
        stale: true,
        source: 'stale-cache',
        error,
      };
    }

    throw error;
  }
};

const fetchTransfersPage = async ({ chain, page, pageSize, sort, startBlock, endBlock, cacheKey }) => {
  const key = cacheKey || buildTransfersPageCacheKey({
    chainId: chain.id,
    page,
    pageSize,
    sort,
    startBlock,
    endBlock,
  });

  let promise = transfersPagePromises.get(key);
  if (!promise) {
    promise = fetchTransfersPageFromChain({
      chain,
      page,
      pageSize,
      sort,
      startBlock,
      endBlock,
    })
      .then((result) => {
        setCachedTransfersPage(key, result);
        return result;
      })
      .finally(() => {
        transfersPagePromises.delete(key);
      });

    transfersPagePromises.set(key, promise);
  }

  return promise;
};

const resolveTransfersPageData = async ({
  chain,
  page,
  pageSize,
  sort,
  startBlock,
  endBlock,
  forceRefresh = false,
}) => {
  const cacheKey = buildTransfersPageCacheKey({
    chainId: chain.id,
    page,
    pageSize,
    sort,
    startBlock,
    endBlock,
  });

  if (forceRefresh) {
    cache.transfersPageCache.delete(cacheKey);
    transfersPagePromises.delete(cacheKey);
  }

  const cached = forceRefresh ? null : getCachedTransfersPage(cacheKey);
  if (cached && !cached.stale && cached.payload) {
    return {
      ...cached.payload,
      cacheTimestamp: cached.timestamp,
      stale: false,
      source: 'cache',
    };
  }

  try {
    const fresh = await fetchTransfersPage({
      chain,
      page,
      pageSize,
      sort,
      startBlock,
      endBlock,
      cacheKey,
    });

    return {
      ...fresh,
      cacheTimestamp: fresh.timestamp,
      stale: false,
      source: 'network',
    };
  } catch (error) {
    if (cached?.payload) {
      console.warn(`! Returning stale transfers page for chain ${chain.name}: ${error.message || error}`);
      return {
        ...cached.payload,
        cacheTimestamp: cached.timestamp,
        stale: true,
        source: 'stale-cache',
        error,
      };
    }

    throw error;
  }
};

const handleAggregatedTransfers = async (req, res, options) => {
  const {
    forceRefresh,
    requestedPage,
    requestedPageSize,
    sort,
    startBlock,
    endBlock,
    filterAddress,
    filterHash,
    includeTotals,
  } = options;

  console.log('-> Fetching aggregated transfers from all chains...');

  try {
    const coerceTotal = (raw) => {
      const numeric = Number(raw);
      return Number.isFinite(numeric) && numeric >= 0 ? numeric : 0;
    };

    const totalsPromise = mapWithConcurrency(
      CHAINS,
      MAX_CONCURRENT_REQUESTS,
      async (chain) => {
        const cacheKey = buildTransfersTotalCacheKey({
          chainId: chain.id,
          startBlock: undefined,
          endBlock: undefined,
        });

        const summary = {
          chainId: chain.id,
          chainName: chain.name,
          total: null,
          available: false,
          stale: false,
          source: null,
          truncated: false,
          windowCapped: false,
          error: null,
          errorCode: null,
        };

        const cached = getCachedTransfersTotal(cacheKey);

        if (cached?.payload) {
          const hasCachedTotal = typeof cached.payload.total !== 'undefined';
          summary.total = hasCachedTotal ? coerceTotal(cached.payload.total) : null;
          summary.available = hasCachedTotal;
          summary.stale = Boolean(cached.stale);
          summary.source = cached.stale ? 'stale-cache' : 'cache';
          summary.truncated = Boolean(cached.payload.truncated);
          summary.windowCapped = Boolean(cached.payload.windowCapped);
        }

        const shouldFetchTotals = forceRefresh || !cached?.payload || cached.stale;

        if (shouldFetchTotals) {
          try {
            const resolved = await resolveTransfersTotalData({
              chain,
              sort,
              startBlock: undefined,
              endBlock: undefined,
              forceRefresh,
            });

            const hasResolvedTotal = typeof resolved.total !== 'undefined';
            summary.total = hasResolvedTotal ? coerceTotal(resolved.total) : null;
            summary.available = hasResolvedTotal;
            summary.stale = Boolean(resolved.stale);
            summary.source = resolved.source || 'network';
            summary.truncated = Boolean(resolved.truncated);
            summary.windowCapped = Boolean(resolved.windowCapped);
            summary.error = null;
            summary.errorCode = null;
          } catch (error) {
            console.warn(`! Could not fetch totals for ${chain.name}: ${error.message || error}`);
            summary.error = error.message || String(error);
            summary.errorCode = error.code || null;
            if (!summary.available) {
              summary.source = 'unavailable';
            }
          }
        }

        if (summary.available && summary.total === null) {
          summary.total = 0;
        }

        summary.available = summary.total !== null && summary.available;
        return summary;
      }
    );

    // When filtering by address or hash, fetch more data to ensure we get all relevant transfers
    // Otherwise users might miss results that are on page 2, 3, etc.
    const isFiltering = filterAddress || filterHash;
    const fetchPageSize = isFiltering ? 100 : requestedPageSize; // Fetch up to 100 per chain when filtering

    // Fetch first page from all chains in parallel
    const results = await mapWithConcurrency(
      CHAINS,
      MAX_CONCURRENT_REQUESTS,
      async (chain) => {
        try {
          const pageData = await resolveTransfersPageData({
            chain,
            page: 1,
            pageSize: fetchPageSize, // Use larger page size when filtering
            sort,
            startBlock,
            endBlock,
            forceRefresh,
          });
          return { chain, data: pageData, error: null };
        } catch (error) {
          console.warn(`! Failed to fetch transfers from ${chain.name}: ${error.message || error}`);
          const debugStack = error?.stack || error;
          console.warn('[AggregatedTransfers] debug stack:', debugStack);
          return { chain, data: null, error, stack: debugStack };
        }
      }
    );

    // Combine all transfers
    const allTransfers = [];
    const chainSummaries = [];
    let displayCount = 0; // Count of transfers fetched for display
    let allTimeTotal = 0; // True all-time total from cached individual chain totals

    const totalsResults = await totalsPromise;
    const totalsByChainId = new Map();
    const totalsMissingChains = [];

    totalsResults.forEach((result, index) => {
      const chain = CHAINS[index];

      if (result.status === 'fulfilled') {
        const summary = result.value;
        const summaryChainId = typeof summary.chainId === 'number' ? summary.chainId : chain?.id;
        const summaryChainName = summary.chainName || chain?.name || `Chain ${summaryChainId ?? index}`;

        const normalizedSummary = {
          chainId: summaryChainId,
          chainName: summaryChainName,
          total: summary.total,
          available: summary.available,
          stale: Boolean(summary.stale),
          source: summary.source || null,
          truncated: Boolean(summary.truncated),
          windowCapped: Boolean(summary.windowCapped),
          error: summary.error,
        };

        totalsByChainId.set(summaryChainId, normalizedSummary);
        chainSummaries.push(normalizedSummary);

        if (summary.available && typeof summary.total === 'number') {
          allTimeTotal += summary.total;
        } else {
          totalsMissingChains.push(summaryChainName);
        }
      } else {
        console.warn(`! Totals promise rejected for ${chain.name}:`, result.reason);
        chainSummaries.push({
          chainId: chain.id,
          chainName: chain.name,
          total: null,
          available: false,
          stale: false,
          source: 'error',
          error: String(result.reason),
        });
        totalsMissingChains.push(chain.name);
      }
    });

    // Process page results
    results.forEach((result) => {
      if (result.status === 'fulfilled') {
        const { chain, data, error } = result.value;
        if (data && Array.isArray(data.transfers)) {
          allTransfers.push(...data.transfers);
        }
      }
    });

    // Sort combined results
    allTransfers.sort((a, b) => {
      const timeA = Number(a.timeStamp);
      const timeB = Number(b.timeStamp);
      return sort === 'asc' ? timeA - timeB : timeB - timeA;
    });

    // Apply client-side filtering
    let filteredTransfers = allTransfers;
    
    if (filterAddress) {
      const lowerAddress = filterAddress.toLowerCase();
      filteredTransfers = filteredTransfers.filter(tx => 
        tx.from.toLowerCase() === lowerAddress || tx.to.toLowerCase() === lowerAddress
      );
    }
    
    if (filterHash) {
      const lowerHash = filterHash.toLowerCase();
      filteredTransfers = filteredTransfers.filter(tx => 
        tx.hash.toLowerCase() === lowerHash
      );
    }
    
    if (startBlock !== undefined || endBlock !== undefined) {
      filteredTransfers = filteredTransfers.filter(tx => {
        const txBlock = Number(tx.blockNumber);
        if (startBlock !== undefined && txBlock < startBlock) return false;
        if (endBlock !== undefined && txBlock > endBlock) return false;
        return true;
      });
    }

    // Pagination on filtered results
    const totalFilteredCount = filteredTransfers.length;
    const startIndex = (requestedPage - 1) * requestedPageSize;
    const endIndex = startIndex + requestedPageSize;
    const paginatedTransfers = filteredTransfers.slice(startIndex, endIndex);
    
    const totalPages = Math.ceil(totalFilteredCount / requestedPageSize);

    return {
      data: paginatedTransfers,
      meta: {
        page: requestedPage,
        pageSize: requestedPageSize,
        total: totalFilteredCount, // Use filtered count for pagination
        totalPages,
        hasMore: requestedPage < totalPages,
        totalIsApproximate: totalsMissingChains.length > 0,
        fetchedCount: allTransfers.length, // Original count before filtering
        filtered: filterAddress || filterHash || startBlock !== undefined || endBlock !== undefined,
        chains: chainSummaries,
      },
    };

  } catch (error) {
    console.error('X Aggregation failed:', error);
    throw error;
  }
};

const ETHERSCAN_RESULT_WINDOW = Number(process.env.ETHERSCAN_RESULT_WINDOW || 10000);
const INGEST_STALE_THRESHOLD_SECONDS = Number(process.env.INGEST_STALE_THRESHOLD_SECONDS || 900);
const BZR_ADDRESS = process.env.BZR_TOKEN_ADDRESS;

const normalizeChainSnapshots = (snapshots = []) => {
  return snapshots.map((snapshot) => {
    const chainDef = getChainDefinition(snapshot.chainId);
    const indexLag = typeof snapshot.status.indexLagSeconds === 'number' ? snapshot.status.indexLagSeconds : null;
    const stale = typeof indexLag === 'number' ? indexLag > INGEST_STALE_THRESHOLD_SECONDS : !snapshot.status.ready;

    return {
      chainId: snapshot.chainId,
      chainName: chainDef?.name || `Chain ${snapshot.chainId}`,
      ready: Boolean(snapshot.status.ready),
      stale,
      indexLagSeconds: indexLag,
      totalTransfers: snapshot.totals?.totalTransfers || 0,
      upstreamTotalTransfers: snapshot.totals?.upstreamTotalTransfers || null,
      upstreamLastBlock: snapshot.totals?.upstreamLastBlock || null,
      upstreamUpdatedAt: snapshot.totals?.upstreamUpdatedAt || null,
      lastBlock: snapshot.cursor?.lastBlock || 0,
      lastTimestamp: snapshot.cursor?.lastTimestamp || 0,
    };
  });
};

const getPersistentTransfers = async (options) => {
  const {
    requestedChainId,
    requestedPage,
    requestedPageSize,
    sort,
    startBlock,
    endBlock,
    filterAddress,
    filterHash,
    includeTotals,
  } = options;

  const storeReady = persistentStore.isPersistentStoreReady();
  const warnings = [];

  if (requestedChainId !== 0 && !getChainDefinition(requestedChainId)) {
    throw new Error(`Unsupported chain requested: ${requestedChainId}`);
  }

  const chainIds = requestedChainId === 0
    ? CHAINS.map((chain) => chain.id)
    : [requestedChainId];

  let pageData = {
    transfers: [],
    resultLength: 0,
    timestamp: Date.now(),
    source: 'store',
  };
  let totalCount = 0;
  let lastTime = null;
  let lagSeconds = null;
  let queryError = null;

  if (!storeReady) {
    warnings.push({
      scope: 'store',
      code: 'STORE_NOT_READY',
      message: 'Transfer snapshots are still initializing; returning current persisted data.',
      retryable: true,
    });
  }

  if (storeReady) {
    try {
      pageData = await persistentStore.queryTransfersPage({
        chainId: chainIds,
        page: requestedPage,
        pageSize: requestedPageSize,
        sort,
        startBlock,
        endBlock,
        filterAddress,
        filterHash,
      });
      // Ensure every transfer row has a human-readable chainName
      if (pageData && Array.isArray(pageData.transfers)) {
        pageData.transfers = pageData.transfers.map((tx) => {
          const chainId = Number(tx.chainId);
          const def = Number.isFinite(chainId) ? getChainDefinition(chainId) : null;
          return {
            ...tx,
            chainName: tx.chainName || def?.name || (Number.isFinite(chainId) ? `Chain ${chainId}` : undefined),
          };
        });
      }
    } catch (error) {
      queryError = error;
      warnings.push({
        scope: 'store',
        code: 'STORE_PAGE_READ_FAILED',
        message: error.message || 'Failed to read transfer page from store. Returning cached snapshot.',
        retryable: true,
      });
    }
  }

  if (storeReady && includeTotals) {
    try {
      totalCount = await persistentStore.countTransfers({ chainId: chainIds, startBlock, endBlock, filterAddress, filterHash });
    } catch (error) {
      warnings.push({
        scope: 'store',
        code: 'STORE_TOTALS_FAILED',
        message: error.message || 'Failed to compute transfer totals; pagination totals may be incomplete.',
        retryable: true,
      });
      totalCount = pageData.resultLength || 0;
    }
  } else {
    totalCount = pageData.resultLength || 0;
  }

  if (storeReady) {
    try {
      const freshness = await persistentStore.getMaxTimestamp({ chainId: chainIds });
      lastTime = freshness.lastTime || null;
      lagSeconds = typeof freshness.lagSeconds === 'number' ? freshness.lagSeconds : null;
    } catch (error) {
      warnings.push({
        scope: 'store',
        code: 'STORE_FRESHNESS_FAILED',
        message: error.message || 'Failed to compute transfer freshness metrics.',
        retryable: true,
      });
    }
  }

  let rawSnapshots = [];
  if (storeReady) {
    try {
      rawSnapshots = await persistentStore.getChainSnapshots(chainIds);
    } catch (error) {
      warnings.push({
        scope: 'store',
        code: 'STORE_SNAPSHOT_FAILED',
        message: error.message || 'Failed to load chain snapshots metadata.',
        retryable: true,
      });
    }
  }

  const normalizedSnapshots = normalizeChainSnapshots(rawSnapshots);

  const snapshotTotals = normalizedSnapshots.reduce((acc, snapshot) => acc + (snapshot.totalTransfers || 0), 0);
  const upstreamTotals = normalizedSnapshots.reduce((acc, snapshot) => acc + (snapshot.upstreamTotalTransfers || 0), 0);
  const metaTotal = includeTotals ? (Number.isFinite(totalCount) ? totalCount : snapshotTotals) : (snapshotTotals || totalCount);
  const metaIndexLag = normalizedSnapshots.reduce((max, snapshot) => {
    if (typeof snapshot.indexLagSeconds === 'number') {
      return max === null ? snapshot.indexLagSeconds : Math.max(max, snapshot.indexLagSeconds);
    }
    return max;
  }, lagSeconds !== null ? lagSeconds : null);
  const metaReady = Boolean(storeReady) && normalizedSnapshots.length > 0
    ? normalizedSnapshots.every((snapshot) => snapshot.ready)
    : Boolean(storeReady) && !queryError;
  const metaStale = typeof metaIndexLag === 'number'
    ? metaIndexLag > INGEST_STALE_THRESHOLD_SECONDS
    : !metaReady;

  if (!metaReady) {
    warnings.push({
      scope: 'store',
      code: 'STORE_DATA_NOT_READY',
      message: 'Transfer snapshots are still preparing; data may be partial.',
      retryable: true,
    });
  }

  const totalPages = Math.ceil(metaTotal / requestedPageSize);
  const hasMore = requestedPage < totalPages;

  return {
    data: pageData.transfers,
    meta: {
      page: requestedPage,
      pageSize: requestedPageSize,
      total: metaTotal,
      totalPages,
      hasMore,
      windowExceeded: false,
      maxWindowPages: null,
      resultWindow: null,
    },
    totals: includeTotals
      ? {
          total: metaTotal,
          upstreamTotal: upstreamTotals > 0 ? upstreamTotals : null,
          allTimeTotal: snapshotTotals,
          truncated: false,
          resultLength: pageData.resultLength,
          timestamp: Date.now(),
          stale: metaStale,
          source: 'store',
          allTimeTotalAvailable: true,
        }
      : null,
    chain: requestedChainId === 0
      ? { id: 0, name: 'All Chains' }
      : getChainDefinition(requestedChainId),
    sort,
    filters: {
      startBlock: typeof startBlock === 'number' ? startBlock : null,
      endBlock: typeof endBlock === 'number' ? endBlock : null,
    },
    timestamp: Date.now(),
    stale: metaStale,
    source: 'store',
    warnings,
    limits: {
      maxPageSize: 100,
      totalFetchLimit: null,
      resultWindow: null,
    },
    defaults: {
      chainId: 0,
      pageSize: 25,
      sort: 'desc',
    },
    warm: {
      chains: normalizedSnapshots,
      timestamp: Date.now(),
    },
    chains: normalizedSnapshots,
    availableChains: [{ id: 0, name: 'All Chains' }, ...CHAINS.map((c) => ({ id: c.id, name: c.name }))],
    request: {
      includeTotals,
    },
  };
};

const getSingleChainTransfers = async (options) => {
  const {
    forceRefresh,
    requestedChainId,
    requestedPage,
    requestedPageSize,
    sort,
    startBlock,
    endBlock,
    includeTotals,
  } = options;

  const chain = getChainDefinition(requestedChainId) || getChainDefinition(TRANSFERS_DEFAULT_CHAIN_ID) || CHAINS[0];
  if (!chain) {
    throw new Error(`Unsupported chain requested: ${requestedChainId}`);
  }

  // Check provider config
  getProviderConfigForChain(chain);

  const chainIsCronos = getProviderKeyForChain(chain) === 'cronos';
  const resultWindowLimit = !chainIsCronos && Number.isFinite(ETHERSCAN_RESULT_WINDOW)
    ? Math.max(0, ETHERSCAN_RESULT_WINDOW)
    : null;
  const maxWindowPagesForRequest = resultWindowLimit
    ? Math.max(1, Math.floor(resultWindowLimit / requestedPageSize) || 1)
    : null;
  const requestExceedsWindow = Boolean(resultWindowLimit && requestedPage > maxWindowPagesForRequest);

  const pagePromise = requestExceedsWindow
    ? Promise.resolve({
        transfers: [],
        upstream: null,
        timestamp: Date.now(),
        page: requestedPage,
        pageSize: requestedPageSize,
        sort,
        startBlock,
        endBlock,
        resultLength: 0,
        windowExceeded: true,
      })
    : resolveTransfersPageData({
        chain,
        page: requestedPage,
        pageSize: requestedPageSize,
        sort,
        startBlock,
        endBlock,
        forceRefresh,
      });

  const totalsPromise = includeTotals
    ? resolveTransfersTotalData({
        chain,
        sort,
        startBlock,
        endBlock,
        forceRefresh,
      })
    : Promise.resolve(null);

  const [pageOutcome, totalsOutcome] = await Promise.allSettled([pagePromise, totalsPromise]);

  if (pageOutcome.status !== 'fulfilled') {
    throw pageOutcome.reason;
  }

  const pageData = pageOutcome.value;
  const warmSummary = getCachedTransfersWarmSummary();
  const warnings = [];

  let totalsData = null;
  if (totalsOutcome.status === 'fulfilled') {
    totalsData = totalsOutcome.value;
    if (totalsData?.windowCapped) {
      warnings.push({
        scope: 'total',
        code: 'TOTAL_COUNT_CAPPED',
        message: `This chain has more than ${totalsData.maxSafeOffset || ETHERSCAN_RESULT_WINDOW} transfers. Total count may be underestimated due to result window limits.`,
        retryable: false,
      });
    }
  } else if (includeTotals) {
    const reason = totalsOutcome.reason || {};
    console.warn(`! Failed to refresh transfer totals for ${chain.name}: ${reason.message || reason}`);
    warnings.push({
      scope: 'total',
      code: reason.code || 'TOTAL_FETCH_FAILED',
      message: reason.message || 'Failed to compute total transfer count; returning latest page data only.',
      retryable: true,
    });
  }

  if (pageData.stale && pageData.error) {
    warnings.push({
      scope: 'page',
      code: pageData.error.code || 'STALE_PAGE',
      message: pageData.error.message || 'Page data returned from stale cache after upstream failure.',
    });
  }

  if (totalsData?.stale && totalsData.error) {
    warnings.push({
      scope: 'total',
      code: totalsData.error.code || 'STALE_TOTAL',
      message: totalsData.error.message || 'Total count returned from stale cache after upstream failure.',
    });
  }

  const windowExceeded = Boolean(pageData.windowExceeded || requestExceedsWindow);
  if (windowExceeded && resultWindowLimit) {
    warnings.push({
      scope: 'page',
      code: 'RESULT_WINDOW_CAP',
      message: `Upstream API only returns the latest ${resultWindowLimit.toLocaleString()} transfers per query. Reduce the page size or apply block filters to view older activity.`,
    });
  }

  const totalCount = totalsData ? totalsData.total : pageData.resultLength || 0;
  const totalPagesRaw = totalCount > 0
    ? Math.ceil(totalCount / requestedPageSize)
    : (pageData.resultLength === requestedPageSize ? requestedPage + 1 : requestedPage);
  const totalPages = maxWindowPagesForRequest
    ? Math.min(totalPagesRaw || maxWindowPagesForRequest, maxWindowPagesForRequest)
    : totalPagesRaw;
  let hasMore = pageData.resultLength === requestedPageSize;
  if (totalCount > 0) {
    hasMore = totalCount > requestedPage * requestedPageSize;
  }
  if (maxWindowPagesForRequest && requestedPage >= maxWindowPagesForRequest) {
    hasMore = false;
  }

  return {
    data: pageData.transfers,
    meta: {
      page: requestedPage,
      pageSize: requestedPageSize,
      total: totalCount,
      totalPages,
      hasMore,
      windowExceeded,
      maxWindowPages: maxWindowPagesForRequest,
      resultWindow: resultWindowLimit,
    },
    totals: includeTotals
      ? {
          total: totalCount,
          truncated: Boolean(totalsData?.windowCapped),
          resultLength: pageData.resultLength,
          timestamp: totalsData ? totalsData.timestamp : Date.now(),
          stale: Boolean(totalsData?.stale),
          source: 'upstream',
        }
      : null,
    chain: {
      id: chain.id,
      name: chain.name,
    },
    sort,
    filters: {
      startBlock: typeof startBlock === 'number' ? startBlock : null,
      endBlock: typeof endBlock === 'number' ? endBlock : null,
    },
    timestamp: pageData.timestamp,
    stale: Boolean(pageData.stale),
    source: 'upstream',
    warnings,
    limits: {
      maxPageSize: 100,
      totalFetchLimit: null,
      resultWindow: resultWindowLimit,
    },
    defaults: {
      chainId: TRANSFERS_DEFAULT_CHAIN_ID,
      pageSize: 25,
      sort: 'desc',
    },
    warm: {
      chains: warmSummary.chains,
      timestamp: warmSummary.timestamp,
    },
    chains: CHAINS.map((c) => ({ id: c.id, name: c.name })),
    request: {
      forceRefresh,
      includeTotals,
    },
  };
};

const TRANSFERS_DEFAULT_PAGE_SIZE = 25;

const clampTransfersPageSize = (size) => {
  const numeric = Number(size);
  if (!Number.isFinite(numeric)) return TRANSFERS_DEFAULT_PAGE_SIZE;
  return Math.min(Math.max(numeric, 10), 100);
};

let transfersRefreshPromise = null;

const warmTransfersCacheForChain = async (chain, { forceRefresh = false, pageSize } = {}) => {
  const startedAt = Date.now();
  const normalizedPageSize = clampTransfersPageSize(pageSize || TRANSFERS_DEFAULT_PAGE_SIZE);
  const summary = {
    chainId: chain.id,
    chainName: chain.name,
    status: 'ok',
    forceRefresh,
    pageSize: normalizedPageSize,
    durationMs: 0,
    timestamp: Date.now(),
    error: null,
    errorCode: null,
    warmed: false,
    totalsWarmed: false,
    totalsWarning: null,
  };

  try {
    // Always warm the page cache first
    await resolveTransfersPageData({
      chain,
      page: 1,
      pageSize: normalizedPageSize,
      sort: 'desc',
      startBlock: undefined,
      endBlock: undefined,
      forceRefresh,
    });
    summary.warmed = true;

    // Then warm totals if possible (best effort)
    try {
      await resolveTransfersTotalData({
        chain,
        sort: 'desc',
        startBlock: undefined,
        endBlock: undefined,
        forceRefresh,
      });
      summary.totalsWarmed = true;
    } catch (totalsError) {
      // Log but don't fail - totals are nice to have but not critical
      console.warn(`! Could not warm totals for ${chain.name}: ${totalsError.message || totalsError}`);
      summary.totalsWarning = totalsError.message || String(totalsError);
      summary.totalsErrorCode = totalsError.code || null;
      // Still mark status as 'ok' since page warming succeeded
    }
  } catch (error) {
    // Only mark as error if page warming failed
    summary.status = 'error';
    summary.error = error.message || String(error);
    summary.errorCode = error.code || null;
    summary.upstream = error.payload || null;
  }

  summary.durationMs = Date.now() - startedAt;
  summary.timestamp = Date.now();
  return summary;
};

const warmTransfersCaches = async ({ forceRefresh = false } = {}) => {
  console.log('-> Warming paginated transfers cache across configured chains...');
  const results = await mapWithConcurrency(
    CHAINS,
    MAX_CONCURRENT_REQUESTS,
    async (chain) => {
      const summary = await warmTransfersCacheForChain(chain, { forceRefresh });
      return summary;
    },
  );

  const summaries = results.map((result, index) => {
    if (result.status === 'fulfilled') {
      return result.value;
    }

    const chain = CHAINS[index];
    return {
      chainId: chain.id,
      chainName: chain.name,
      status: 'error',
      error: result.reason?.message || String(result.reason),
      errorCode: result.reason?.code || null,
      upstream: result.reason?.payload || null,
      durationMs: 0,
      timestamp: Date.now(),
      forceRefresh,
    };
  });

  cache.transfersWarmStatus = summaries;
  cache.transfersWarmTimestamp = Date.now();
  return summaries;
};

const triggerTransfersRefresh = ({ forceRefresh = false } = {}) => {
  if (transfersRefreshPromise) {
    return transfersRefreshPromise;
  }

  transfersRefreshPromise = warmTransfersCaches({ forceRefresh })
    .catch((error) => {
      console.error('X Failed to warm transfers cache:', error.message || error);
      throw error;
    })
    .finally(() => {
      transfersRefreshPromise = null;
    });

  return transfersRefreshPromise;
};

const isTransfersRefreshInFlight = () => Boolean(transfersRefreshPromise);

module.exports = {
  handleAggregatedTransfers,
  resolveTransfersTotalData,
  resolveTransfersPageData,
  getPersistentTransfers,
  getSingleChainTransfers,
  normalizeChainSnapshots,
  triggerTransfersRefresh,
  isTransfersRefreshInFlight,
  isStoreReady: persistentStore.isPersistentStoreReady,
};
