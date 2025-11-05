import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  ApiError,
  TokenInfo,
  TokenStats,
  Transfer,
  TransferWarmSummary,
  TransfersResponse,
  TransferPaginationMeta,
  TransferTotalsMeta,
  TransferWarning,
  TransferLimitsMeta,
  TransferDefaultsMeta,
  TransferAvailableChain,
  TransferFiltersMeta,
  TokenPriceResponse,
  FinalityResponse,
  Holder,
  HoldersResponse,
} from '../types/api';

const REQUEST_TIMEOUT_MS = 30_000; // Increased to 30s for larger page sizes and aggregated views
const STALE_RETRY_DELAY_MS = 1_500;
const TRANSFERS_STORAGE_KEY = 'bzr:lastTransfers';

type TransfersQueryState = {
  chainId: number;
  page: number;
  pageSize: number;
  sort: 'asc' | 'desc';
  startBlock: number | null;
  endBlock: number | null;
  includeTotals: boolean;
};

const defaultTransfersQuery: TransfersQueryState = {
  chainId: 0, // Default to "All Chains" aggregated view
  page: 1,
  pageSize: 10,
  sort: 'desc',
  startBlock: null,
  endBlock: null,
  includeTotals: true,
};

type FetchMode = 'initial' | 'refresh' | 'background';

type FetchOptions = {
  mode?: FetchMode;
  force?: boolean;
};

type TransfersMetaState = {
  pagination: TransferPaginationMeta | null;
  totals: TransferTotalsMeta | null;
  chain: { id: number; name: string } | null;
  filters: TransferFiltersMeta;
  timestamp: number | null;
  stale: boolean;
  source: 'network' | 'cache' | 'stale-cache';
  warnings: TransferWarning[];
  limits: TransferLimitsMeta | null;
  availableChains: TransferAvailableChain[];
  defaults: TransferDefaultsMeta | null;
  warm: {
    chains: TransferWarmSummary[];
    timestamp: number | null;
  } | null;
};

type TransfersCachePayload = {
  data: Transfer[];
  meta: TransfersMetaState & {
    query: TransfersQueryState;
  };
};

type UseTokenDataResult = {
  info: TokenInfo | null;
  transfers: Transfer[];
  stats: TokenStats | null;
  loadingInfo: boolean;
  loadingTransfers: boolean;
  refreshing: boolean;
  error: ApiError | null;
  refresh: () => Promise<void>;
  lastUpdated: number | null;
  transfersPagination: TransferPaginationMeta | null;
  transfersTotals: TransferTotalsMeta | null;
  transfersWarnings: TransferWarning[];
  transfersChain: { id: number; name: string } | null;
  transfersSource: 'network' | 'cache' | 'stale-cache';
  transfersFilters: TransferFiltersMeta;
  transfersLimits: TransferLimitsMeta | null;
  transfersDefaults: TransferDefaultsMeta | null;
  availableChains: TransferAvailableChain[];
  warmSummaries: TransferWarmSummary[];
  warmTimestamp: number | null;
  transfersStale: boolean;
  transfersQuery: TransfersQueryState;
  setTransfersChain: (chainId: number) => void;
  setTransfersPage: (page: number) => void;
  setTransfersPageSize: (pageSize: number) => void;
  setTransfersSort: (sort: 'asc' | 'desc') => void;
  setTransfersBlockRange: (startBlock: number | null, endBlock: number | null) => void;
  setTransfersIncludeTotals: (includeTotals: boolean) => void;
  tokenPrice: TokenPriceResponse | null;
  loadingTokenPrice: boolean;
  tokenPriceError: ApiError | null;
  finality: FinalityResponse | null;
  loadingFinality: boolean;
  finalityError: ApiError | null;
  loadingStats: boolean;
  statsError: ApiError | null;
  holders: Holder[];
  loadingHolders: boolean;
  holdersError: ApiError | null;
  holdersChainId: number;
  setHoldersChainId: (chainId: number) => void;
  holdersPage: number;
  setHoldersPage: (page: number) => void;
  holdersPageSize: number;
  setHoldersPageSize: (pageSize: number) => void;
  refreshHolders: () => Promise<void>;
};

type RawTransfer = Omit<Transfer, 'tokenDecimal'> & {
  tokenDecimal: number | string;
};

const parseJsonResponse = async <T>(response: Response): Promise<T> => {
  const contentType = response.headers.get('content-type');
  let payload: unknown;

  if (contentType && contentType.includes('application/json')) {
    payload = await response.json();
  } else {
    const text = await response.text();
    try {
      payload = JSON.parse(text);
    } catch {
      payload = text;
    }
  }

  if (!response.ok) {
    const message = typeof payload === 'string'
      ? payload
      : (typeof payload === 'object' && payload !== null && 'message' in payload && typeof (payload as { message?: unknown }).message === 'string')
        ? (payload as { message: string }).message
        : response.statusText;
    throw new Error(message || 'Request failed');
  }

  return payload as T;
};

const mapTransfers = (transfers: RawTransfer[]): Transfer[] => {
  if (!Array.isArray(transfers)) return [];
  return transfers.map((transfer) => ({
    ...transfer,
    tokenDecimal: Number(transfer.tokenDecimal) || 0,
    timeStamp: String(transfer.timeStamp),
  }));
};

const queriesEqual = (a: TransfersQueryState, b: TransfersQueryState): boolean =>
  a.chainId === b.chainId
  && a.page === b.page
  && a.pageSize === b.pageSize
  && a.sort === b.sort
  && a.startBlock === b.startBlock
  && a.endBlock === b.endBlock
  && a.includeTotals === b.includeTotals;

const buildTransfersUrl = (query: TransfersQueryState, options: { force?: boolean } = {}): string => {
  const params = new URLSearchParams();
  params.set('chainId', String(query.chainId));
  params.set('page', String(query.page));
  params.set('pageSize', String(query.pageSize));

  if (query.sort !== 'desc') {
    params.set('sort', query.sort);
  }

  if (typeof query.startBlock === 'number') {
    params.set('startBlock', String(query.startBlock));
  }

  if (typeof query.endBlock === 'number') {
    params.set('endBlock', String(query.endBlock));
  }

  if (!query.includeTotals) {
    params.set('includeTotals', 'false');
  }

  if (options.force) {
    params.set('force', 'true');
  }

  const qs = params.toString();
  return qs.length ? `/api/transfers?${qs}` : '/api/transfers';
};

const persistTransfers = (
  transfers: Transfer[],
  meta: TransfersCachePayload['meta']
) => {
  if (typeof window === 'undefined') return;

  try {
    const payload: TransfersCachePayload = {
      data: transfers,
      meta,
    };
    window.localStorage.setItem(TRANSFERS_STORAGE_KEY, JSON.stringify(payload));
  } catch (error) {
    console.warn('Unable to persist transfers cache:', error);
  }
};

export const useTokenData = (): UseTokenDataResult => {
  const [info, setInfo] = useState<TokenInfo | null>(null);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [stats, setStats] = useState<TokenStats | null>(null);
  const [loadingInfo, setLoadingInfo] = useState(true);
  const [loadingTransfers, setLoadingTransfers] = useState(true);
  const [refreshingState, setRefreshingState] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const [transfersPagination, setTransfersPagination] = useState<TransferPaginationMeta | null>(null);
  const [transfersTotals, setTransfersTotals] = useState<TransferTotalsMeta | null>(null);
  const [transfersWarnings, setTransfersWarnings] = useState<TransferWarning[]>([]);
  const [transfersChain, setTransfersChainMeta] = useState<{ id: number; name: string } | null>(null);
  const [transfersSource, setTransfersSource] = useState<'network' | 'cache' | 'stale-cache'>('network');
  const [transfersFilters, setTransfersFilters] = useState<TransferFiltersMeta>({ startBlock: null, endBlock: null });
  const [transfersLimits, setTransfersLimits] = useState<TransferLimitsMeta | null>(null);
  const [availableChains, setAvailableChains] = useState<TransferAvailableChain[]>([]);
  const [warmSummaries, setWarmSummaries] = useState<TransferWarmSummary[]>([]);
  const [warmTimestamp, setWarmTimestamp] = useState<number | null>(null);
  const [transfersStale, setTransfersStale] = useState(false);
  const [transfersQuery, setTransfersQuery] = useState<TransfersQueryState>(defaultTransfersQuery);
  const [transfersDefaults, setTransfersDefaults] = useState<TransferDefaultsMeta | null>(null);
  const [tokenPrice, setTokenPrice] = useState<TokenPriceResponse | null>(null);
  const [loadingTokenPrice, setLoadingTokenPrice] = useState(false);
  const [tokenPriceError, setTokenPriceError] = useState<ApiError | null>(null);
  const [finality, setFinality] = useState<FinalityResponse | null>(null);
  const [loadingFinality, setLoadingFinality] = useState(false);
  const [finalityError, setFinalityError] = useState<ApiError | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [statsError, setStatsError] = useState<ApiError | null>(null);
  const [holders, setHolders] = useState<Holder[]>([]);
  const [loadingHolders, setLoadingHolders] = useState(false);
  const [holdersError, setHoldersError] = useState<ApiError | null>(null);
  const [holdersChainId, setHoldersChainIdState] = useState(1); // Default to Ethereum
  const [holdersPage, setHoldersPage] = useState(1);
  const [holdersPageSize, setHoldersPageSize] = useState(10);

  const infoLoadingRef = useRef(loadingInfo);
  const transfersLoadingRef = useRef(loadingTransfers);
  const refreshingRef = useRef(refreshingState);
  const abortRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);
  const staleRetryRef = useRef<number | null>(null);
  const transfersQueryRef = useRef<TransfersQueryState>(defaultTransfersQuery);
  const suppressQueryEffectRef = useRef(false);
  const queryInitializedRef = useRef(false);
  const previousChainIdRef = useRef<number>(defaultTransfersQuery.chainId);

  const updateTransfersQuery = useCallback((updates: Partial<TransfersQueryState>) => {
    setTransfersQuery((prev) => {
      const next = { ...prev, ...updates } as TransfersQueryState;
      if (queriesEqual(prev, next)) {
        return prev;
      }
      
      // If chainId is changing, clear transfers immediately to prevent showing mixed results
      if ('chainId' in updates && typeof updates.chainId === 'number' && updates.chainId !== prev.chainId) {
        setTransfers([]);
        setTransfersLoadingState(true);
        previousChainIdRef.current = updates.chainId;
      }
      
      transfersQueryRef.current = next;
      return next;
    });
  }, []);

  const setTransfersChain = useCallback((chainId: number) => {
    updateTransfersQuery({ chainId, page: 1 });
  }, [updateTransfersQuery]);

  const setTransfersPage = useCallback((page: number) => {
    const normalized = Number.isFinite(page) ? Math.max(1, Math.floor(page)) : 1;
    updateTransfersQuery({ page: normalized });
  }, [updateTransfersQuery]);

  const setTransfersPageSize = useCallback((pageSize: number) => {
    const normalized = Number.isFinite(pageSize) ? Math.max(1, Math.floor(pageSize)) : 1;
    updateTransfersQuery({ pageSize: normalized, page: 1 });
  }, [updateTransfersQuery]);

  const setTransfersSort = useCallback((sort: 'asc' | 'desc') => {
    updateTransfersQuery({ sort: sort === 'asc' ? 'asc' : 'desc', page: 1 });
  }, [updateTransfersQuery]);

  const setTransfersBlockRange = useCallback((startBlock: number | null, endBlock: number | null) => {
    const sanitize = (value: number | null) => {
      if (value == null) return null;
      const numeric = Number(value);
      if (!Number.isFinite(numeric) || numeric < 0) return null;
      return Math.floor(numeric);
    };

    const normalizedStart = sanitize(startBlock);
    const normalizedEnd = sanitize(endBlock);
    updateTransfersQuery({ startBlock: normalizedStart, endBlock: normalizedEnd, page: 1 });
  }, [updateTransfersQuery]);

  const setTransfersIncludeTotals = useCallback((includeTotals: boolean) => {
    updateTransfersQuery({ includeTotals: Boolean(includeTotals) });
  }, [updateTransfersQuery]);

  const setHoldersChainId = useCallback((chainId: number) => {
    setHoldersChainIdState(chainId);
    setHoldersPage(1); // Reset to first page when chain changes
  }, []);

  const refreshHolders = useCallback(async () => {
    if (!mountedRef.current) return;
    
    setLoadingHolders(true);
    setHoldersError(null);
    
    try {
      const response = await fetch(`/api/holders?chainId=${holdersChainId}&page=${holdersPage}&pageSize=${holdersPageSize}`, {
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
      
      const data: HoldersResponse = await parseJsonResponse(response);
      
      if (!mountedRef.current) return;
      
      setHolders(data.data || []);
    } catch (error: unknown) {
      if (!mountedRef.current) return;
      
      const err = error as Error;
      console.error('Error fetching holders:', err.message);
      setHoldersError({ message: err.message || 'Failed to fetch holders' });
      setHolders([]);
    } finally {
      if (mountedRef.current) {
        setLoadingHolders(false);
      }
    }
  }, [holdersChainId, holdersPage, holdersPageSize]);

  const setInfoLoadingState = useCallback((value: boolean) => {
    infoLoadingRef.current = value;
    setLoadingInfo(value);
  }, []);

  const setTransfersLoadingState = useCallback((value: boolean) => {
    transfersLoadingRef.current = value;
    setLoadingTransfers(value);
  }, []);

  const setRefreshing = useCallback((value: boolean) => {
    refreshingRef.current = value;
    setRefreshingState(value);
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const raw = window.localStorage.getItem(TRANSFERS_STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as Partial<TransfersCachePayload>;
          if (Array.isArray(parsed.data)) {
            setTransfers(parsed.data as Transfer[]);
            setTransfersLoadingState(false);
          }

          const meta = parsed?.meta;
          if (meta) {
            setTransfersPagination(meta.pagination ?? null);
            setTransfersTotals(meta.totals ?? null);
            setTransfersWarnings(Array.isArray(meta.warnings) ? meta.warnings : []);
            setTransfersChainMeta(meta.chain ?? null);
            setTransfersSource(meta.source ?? 'network');
            setTransfersFilters(meta.filters ?? { startBlock: null, endBlock: null });
            setTransfersLimits(meta.limits ?? null);
            setAvailableChains(Array.isArray(meta.availableChains) ? meta.availableChains : []);
            setTransfersDefaults(meta.defaults ?? null);
            const warm = meta.warm;
            if (warm) {
              setWarmSummaries(Array.isArray(warm.chains) ? warm.chains : []);
              setWarmTimestamp(typeof warm.timestamp === 'number' ? warm.timestamp : null);
            } else {
              setWarmSummaries([]);
              setWarmTimestamp(null);
            }
            setLastUpdated(typeof meta.timestamp === 'number' ? meta.timestamp : null);
            setTransfersStale(Boolean(meta.stale));

            if (meta.query) {
              suppressQueryEffectRef.current = true;
              transfersQueryRef.current = meta.query;
              setTransfersQuery(meta.query);
            }
          }
        }
      } catch (storageError) {
        console.warn('Failed to read cached transfers from storage:', storageError);
      }
    }
  }, [setTransfersLoadingState]);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
      abortRef.current?.abort();
      if (staleRetryRef.current) {
        window.clearTimeout(staleRetryRef.current);
      }
    };
  }, []);

  const fetchData = useCallback(async function fetchDataInner({ mode = 'initial', force = false }: FetchOptions = {}) {
    if (!mountedRef.current) return;

    const isInitial = mode === 'initial';
    const isRefresh = mode === 'refresh';
    const isBackground = mode === 'background';

    if (isRefresh && refreshingRef.current) {
      return;
    }

    abortRef.current?.abort();

    const controller = new AbortController();
    let timedOut = false;
    const timeoutId = window.setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, REQUEST_TIMEOUT_MS);
    abortRef.current = controller;

    if (isInitial) {
      setInfoLoadingState(true);
      if (!transfers.length) {
        setTransfersLoadingState(true);
      }
    }

    if (isRefresh && !isBackground) {
      setRefreshing(true);
      setTransfersLoadingState(true);
    }

    if (!isBackground) {
      setError(null);
    }

    const shouldFetchInfo = isInitial || isRefresh || force || !info;
    const shouldFetchStats = isInitial || isRefresh || force;
    const shouldFetchTokenPrice = !isBackground;
    const shouldFetchFinality = !isBackground;

    const infoPromise = shouldFetchInfo
      ? (async () => {
          try {
            const infoResponse = await fetch('/api/info', { 
              signal: controller.signal,
              cache: 'no-cache',
              headers: {
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache'
              }
            });
            const infoData = await parseJsonResponse<TokenInfo>(infoResponse);
            if (!mountedRef.current) return;
            setInfo(infoData);
            setError(null); // Clear any previous errors on success
          } catch (err) {
            if (!mountedRef.current) return;
            if ((err as DOMException).name === 'AbortError') {
              return;
            }
            console.error('[useTokenData] Info fetch error:', err);
            setError({ message: (err as Error).message || 'Failed to load token info' });
          } finally {
            if (mountedRef.current) {
              setInfoLoadingState(false);
            }
          }
        })()
      : Promise.resolve();

    if (shouldFetchStats) {
      setLoadingStats(true);
      if (!isBackground) {
        setStatsError(null);
      }
    }

    if (shouldFetchTokenPrice) {
      setLoadingTokenPrice(true);
      if (!isBackground) {
        setTokenPriceError(null);
      }
    }

    if (shouldFetchFinality) {
      setLoadingFinality(true);
      if (!isBackground) {
        setFinalityError(null);
      }
    }

    const transfersPromise = (async () => {
      try {
        const querySnapshot = transfersQueryRef.current;
        const transfersUrl = buildTransfersUrl(querySnapshot, { force });
        const transfersResponse = await fetch(transfersUrl, { signal: controller.signal });
        const transfersPayload = await parseJsonResponse<TransfersResponse<RawTransfer>>(transfersResponse);

        if (!mountedRef.current) return;

        const normalizedTransfers = mapTransfers(transfersPayload.data);
        setTransfers(normalizedTransfers);

        const timestamp = typeof transfersPayload.timestamp === 'number'
          ? transfersPayload.timestamp
          : Date.now();
        setLastUpdated(timestamp);

        const staleFlag = Boolean(transfersPayload.stale);
        setTransfersStale(staleFlag);

        const paginationMeta = transfersPayload.pagination ?? null;
        setTransfersPagination(paginationMeta);

        const totalsMeta = transfersPayload.totals ?? null;
        setTransfersTotals(totalsMeta);

        const warningsList = Array.isArray(transfersPayload.warnings) ? transfersPayload.warnings : [];
        setTransfersWarnings(warningsList);

        const chainMeta = transfersPayload.chain ?? null;
        setTransfersChainMeta(chainMeta);

        const filtersMeta = transfersPayload.filters ?? { startBlock: null, endBlock: null };
        setTransfersFilters(filtersMeta);

        const sourceMeta = transfersPayload.source ?? 'network';
        setTransfersSource(sourceMeta);

        const limitsMeta = transfersPayload.limits ?? null;
        setTransfersLimits(limitsMeta);

        const availChains = Array.isArray(transfersPayload.availableChains) ? transfersPayload.availableChains : [];
        setAvailableChains(availChains);

        const defaultsMeta = transfersPayload.defaults ?? null;
        setTransfersDefaults(defaultsMeta);

        const warmMeta = transfersPayload.warm ?? {
          chains: Array.isArray(transfersPayload.chains) ? transfersPayload.chains : [],
          timestamp: null,
        };
        setWarmSummaries(Array.isArray(warmMeta.chains) ? warmMeta.chains : []);
        setWarmTimestamp(typeof warmMeta.timestamp === 'number' ? warmMeta.timestamp : null);

        const normalizedQuery: TransfersQueryState = {
          chainId: chainMeta?.id ?? querySnapshot.chainId,
          page: paginationMeta?.page ?? querySnapshot.page,
          pageSize: paginationMeta?.pageSize ?? querySnapshot.pageSize,
          sort: transfersPayload.sort ?? querySnapshot.sort,
          startBlock: filtersMeta.startBlock ?? null,
          endBlock: filtersMeta.endBlock ?? null,
          includeTotals: Boolean(transfersPayload.request?.includeTotals ?? querySnapshot.includeTotals),
        };

        if (!queriesEqual(transfersQueryRef.current, normalizedQuery)) {
          suppressQueryEffectRef.current = true;
          transfersQueryRef.current = normalizedQuery;
          setTransfersQuery(normalizedQuery);
        }

        const metaForCache: TransfersCachePayload['meta'] = {
          pagination: paginationMeta,
          totals: totalsMeta,
          chain: chainMeta,
          filters: filtersMeta,
          timestamp,
          stale: staleFlag,
          source: sourceMeta,
          warnings: warningsList,
          limits: limitsMeta,
          availableChains: availChains,
          defaults: defaultsMeta,
          warm: warmMeta,
          query: normalizedQuery,
        };

        persistTransfers(normalizedTransfers, metaForCache);

        if (!force && staleFlag) {
          if (staleRetryRef.current) {
            window.clearTimeout(staleRetryRef.current);
          }
          staleRetryRef.current = window.setTimeout(() => {
            if (!mountedRef.current) return;
            fetchDataInner({ mode: 'background', force: true });
          }, STALE_RETRY_DELAY_MS);
        }
      } catch (err) {
        if (!mountedRef.current) return;

        if ((err as DOMException).name === 'AbortError') {
          if (timedOut) {
            setError({ message: 'Request timed out. Please try again.' });
          }
          return;
        }

        setError({ message: (err as Error).message || 'Some data could not be loaded' });
      } finally {
        if (mountedRef.current) {
          setTransfersLoadingState(false);
          if (isRefresh || isBackground) {
            setRefreshing(false);
          }
        }
      }
    })();

    const statsPromise = shouldFetchStats
      ? (async () => {
          try {
            const statsResponse = await fetch('/api/stats', { signal: controller.signal });
            const statsPayload = await parseJsonResponse<TokenStats>(statsResponse);
            console.log('[useTokenData] Stats fetched:', { totalHolders: statsPayload.totalHolders, timestamp: new Date().toISOString() });
            if (!mountedRef.current) return;
            setStats(statsPayload);
          } catch (err) {
            if (!mountedRef.current) return;
            if ((err as DOMException).name === 'AbortError') {
              return;
            }
            console.error('Failed to load stats:', err);
            setStatsError({ message: (err as Error).message || 'Failed to load holder stats' });
          } finally {
            if (mountedRef.current) {
              setLoadingStats(false);
            }
          }
        })()
      : Promise.resolve();

    const tokenPricePromise = shouldFetchTokenPrice
      ? (async () => {
          try {
            const priceResponse = await fetch('/api/token-price', { signal: controller.signal });
            const pricePayload = await parseJsonResponse<TokenPriceResponse>(priceResponse);
            if (!mountedRef.current) return;
            setTokenPrice(pricePayload);
          } catch (err) {
            if (!mountedRef.current) return;
            if ((err as DOMException).name === 'AbortError') {
              return;
            }
            console.error('Failed to load token price:', err);
            setTokenPriceError({ message: (err as Error).message || 'Failed to load token price' });
          } finally {
            if (mountedRef.current) {
              setLoadingTokenPrice(false);
            }
          }
        })()
      : Promise.resolve();

    const finalityPromise = shouldFetchFinality
      ? (async () => {
          try {
            const finalityResponse = await fetch('/api/finality', { signal: controller.signal });
            const finalityPayload = await parseJsonResponse<FinalityResponse>(finalityResponse);
            if (!mountedRef.current) return;
            setFinality(finalityPayload);
          } catch (err) {
            if (!mountedRef.current) return;
            if ((err as DOMException).name === 'AbortError') {
              return;
            }
            console.error('Failed to load finalized block:', err);
            setFinalityError({ message: (err as Error).message || 'Failed to load finalized block' });
          } finally {
            if (mountedRef.current) {
              setLoadingFinality(false);
            }
          }
        })()
      : Promise.resolve();

    try {
      await Promise.allSettled([infoPromise, transfersPromise, statsPromise, tokenPricePromise, finalityPromise]);
    } finally {
      window.clearTimeout(timeoutId);
      if (mountedRef.current) {
        abortRef.current = null;
        if (isInitial && !shouldFetchInfo) {
          setInfoLoadingState(false);
        }
      }
    }
  }, [setInfoLoadingState, setTransfersLoadingState, setRefreshing, transfers.length]);

  useEffect(() => {
    fetchData({ mode: 'initial' });
  }, [fetchData]);

  useEffect(() => {
    if (!queryInitializedRef.current) {
      queryInitializedRef.current = true;
      return;
    }

    if (suppressQueryEffectRef.current) {
      suppressQueryEffectRef.current = false;
      return;
    }

    fetchData({ mode: 'refresh', force: true });
  }, [transfersQuery, fetchData]);

  const refresh = useCallback(async () => {
    await fetchData({ mode: 'refresh', force: true });
  }, [fetchData]);

  return {
    info,
    transfers,
    stats,
    loadingInfo,
    loadingTransfers,
    refreshing: refreshingState,
    error,
    refresh,
    lastUpdated,
    transfersPagination,
    transfersTotals,
    transfersWarnings,
    transfersChain,
    transfersSource,
    transfersFilters,
    transfersLimits,
    transfersDefaults,
    availableChains,
    warmSummaries,
    warmTimestamp,
    transfersStale,
    transfersQuery,
    setTransfersChain,
    setTransfersPage,
    setTransfersPageSize,
    setTransfersSort,
    setTransfersBlockRange,
    setTransfersIncludeTotals,
    tokenPrice,
    loadingTokenPrice,
    tokenPriceError,
    finality,
    loadingFinality,
    finalityError,
    loadingStats,
    statsError,
    holders,
    loadingHolders,
    holdersError,
    holdersChainId,
    setHoldersChainId,
    holdersPage,
    setHoldersPage,
    holdersPageSize,
    setHoldersPageSize,
    refreshHolders,
  };
};
