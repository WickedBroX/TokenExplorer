import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  ApiError,
  TokenInfo,
  TokenStats,
  Transfer,
  TransferChainStatus,
  TransfersResponse,
} from '../types/api';

const REQUEST_TIMEOUT_MS = 10_000;
const STALE_RETRY_DELAY_MS = 1_500;
const TRANSFERS_STORAGE_KEY = 'bzr:lastTransfers';

const contractLinks = [
  { name: 'Ethereum', url: 'https://etherscan.io/address/' },
  { name: 'Polygon', url: 'https://polygonscan.com/address/' },
  { name: 'BSC', url: 'https://bscscan.com/address/' },
  { name: 'Arbitrum', url: 'https://arbiscan.io/address/' },
  { name: 'Optimism', url: 'https://optimistic.etherscan.io/address/' },
  { name: 'Avalanche', url: 'https://subnets.avax.network/c-chain/address/' },
  { name: 'Base', url: 'https://basescan.org/address/' },
  { name: 'zkSync', url: 'https://explorer.zksync.io/address/' },
  { name: 'Mantle', url: 'https://mantlescan.xyz/address/' },
  { name: 'Cronos', url: 'https://cronoscan.com/address/' },
];

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

  const assignProStats = useCallback(() => {
    setStats({
      totalHolders: 'Pro Feature',
      chains: contractLinks.map((link) => ({
        chainName: link.name,
        chainId: 0,
        holderCount: 0,
        isLoading: false,
        error: 'Pro Feature Required',
      })),
    });
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
        assignProStats();
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

    try {
      await Promise.allSettled([infoPromise, transfersPromise]);
    } finally {
      window.clearTimeout(timeoutId);
      if (mountedRef.current) {
        abortRef.current = null;
        if (isInitial && !shouldFetchInfo) {
          setInfoLoadingState(false);
        }
      }
    }
  }, [assignProStats, setInfoLoadingState, setTransfersLoadingState, setRefreshing, transfers.length]);

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
  };
};
