import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  ApiError,
  TokenInfo,
  TokenStats,
  Transfer,
  TransferChainStatus,
  TransfersResponse,
  TokenPriceResponse,
  FinalityResponse,
} from '../types/api';

const REQUEST_TIMEOUT_MS = 10_000;
const STALE_RETRY_DELAY_MS = 1_500;
const TRANSFERS_STORAGE_KEY = 'bzr:lastTransfers';

type FetchMode = 'initial' | 'refresh' | 'background';

type FetchOptions = {
  mode?: FetchMode;
  force?: boolean;
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
  chainStatuses: TransferChainStatus[];
  transfersStale: boolean;
  tokenPrice: TokenPriceResponse | null;
  loadingTokenPrice: boolean;
  tokenPriceError: ApiError | null;
  finality: FinalityResponse | null;
  loadingFinality: boolean;
  finalityError: ApiError | null;
  loadingStats: boolean;
  statsError: ApiError | null;
};

type RawTransfer = Omit<Transfer, 'tokenDecimal'> & {
  tokenDecimal: number | string;
};

const parseJsonResponse = async <T>(response: Response): Promise<T> => {
  const contentType = response.headers.get('content-type');
  let payload: any;

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
      : payload?.message || response.statusText;
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

const persistTransfers = (
  transfers: Transfer[],
  meta: { chains: TransferChainStatus[]; timestamp: number | null; stale: boolean }
) => {
  if (typeof window === 'undefined') return;

  try {
    const payload = {
      data: transfers,
      chains: meta.chains,
      timestamp: meta.timestamp,
      stale: meta.stale,
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
  const [chainStatuses, setChainStatuses] = useState<TransferChainStatus[]>([]);
  const [transfersStale, setTransfersStale] = useState(false);
  const [tokenPrice, setTokenPrice] = useState<TokenPriceResponse | null>(null);
  const [loadingTokenPrice, setLoadingTokenPrice] = useState(false);
  const [tokenPriceError, setTokenPriceError] = useState<ApiError | null>(null);
  const [finality, setFinality] = useState<FinalityResponse | null>(null);
  const [loadingFinality, setLoadingFinality] = useState(false);
  const [finalityError, setFinalityError] = useState<ApiError | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [statsError, setStatsError] = useState<ApiError | null>(null);

  const infoLoadingRef = useRef(loadingInfo);
  const transfersLoadingRef = useRef(loadingTransfers);
  const refreshingRef = useRef(refreshingState);
  const abortRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);
  const staleRetryRef = useRef<number | null>(null);

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
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed.data)) {
            setTransfers(parsed.data as Transfer[]);
            setChainStatuses(Array.isArray(parsed.chains) ? parsed.chains : []);
            setLastUpdated(typeof parsed.timestamp === 'number' ? parsed.timestamp : null);
            setTransfersStale(Boolean(parsed.stale));
            setTransfersLoadingState(false);
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

    const shouldFetchInfo = isInitial;
    const shouldFetchStats = isInitial || isRefresh || force;
    const shouldFetchTokenPrice = !isBackground;
    const shouldFetchFinality = !isBackground;

    const infoPromise = shouldFetchInfo
      ? (async () => {
          try {
            const infoResponse = await fetch('/api/info', { signal: controller.signal });
            const infoData = await parseJsonResponse<TokenInfo>(infoResponse);
            if (!mountedRef.current) return;
            setInfo(infoData);
          } catch (err) {
            if (!mountedRef.current) return;
            if ((err as DOMException).name === 'AbortError') {
              return;
            }
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
        const transfersUrl = force ? '/api/transfers?force=true' : '/api/transfers';
        const transfersResponse = await fetch(transfersUrl, { signal: controller.signal });
        const transfersPayload = await parseJsonResponse<TransfersResponse<RawTransfer>>(transfersResponse);

        if (!mountedRef.current) return;

        const normalized = mapTransfers(transfersPayload.data);
        setTransfers(normalized);
        setChainStatuses(Array.isArray(transfersPayload.chains) ? transfersPayload.chains : []);
        const timestamp = typeof transfersPayload.timestamp === 'number'
          ? transfersPayload.timestamp
          : Date.now();
        setLastUpdated(timestamp);
        setTransfersStale(Boolean(transfersPayload.stale));
        setTransfersLoadingState(false);

        persistTransfers(normalized, {
          chains: Array.isArray(transfersPayload.chains) ? transfersPayload.chains : [],
          timestamp,
          stale: Boolean(transfersPayload.stale),
        });

        if (!force && transfersPayload.stale) {
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
        if (!mountedRef.current) return;
        setTransfersLoadingState(false);
        if (isRefresh || isBackground) {
          setRefreshing(false);
        }
      }
    })();

    const statsPromise = shouldFetchStats
      ? (async () => {
          try {
            const statsResponse = await fetch('/api/stats', { signal: controller.signal });
            const statsPayload = await parseJsonResponse<TokenStats>(statsResponse);
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
    chainStatuses,
    transfersStale,
    tokenPrice,
    loadingTokenPrice,
    tokenPriceError,
    finality,
    loadingFinality,
    finalityError,
    loadingStats,
    statsError,
  };
};
