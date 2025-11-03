import { useCallback, useEffect, useRef, useState } from 'react';
import type { ApiError, TokenInfo, TokenStats, Transfer } from '../types/api';

const REQUEST_TIMEOUT_MS = 10_000;

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

type FetchOptions = {
  isRefresh?: boolean;
};

type UseTokenDataResult = {
  info: TokenInfo | null;
  transfers: Transfer[];
  stats: TokenStats | null;
  loading: boolean;
  refreshing: boolean;
  error: ApiError | null;
  refresh: () => Promise<void>;
  lastUpdated: number | null;
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

export const useTokenData = (): UseTokenDataResult => {
  const [info, setInfo] = useState<TokenInfo | null>(null);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [stats, setStats] = useState<TokenStats | null>(null);
  const [loadingState, setLoadingState] = useState(true);
  const [refreshingState, setRefreshingState] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);

  const loadingRef = useRef(loadingState);
  const refreshingRef = useRef(refreshingState);
  const abortRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);

  const setLoading = useCallback((value: boolean) => {
    loadingRef.current = value;
    setLoadingState(value);
  }, []);

  const setRefreshing = useCallback((value: boolean) => {
    refreshingRef.current = value;
    setRefreshingState(value);
  }, []);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
      abortRef.current?.abort();
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

  const fetchData = useCallback(async ({ isRefresh = false }: FetchOptions = {}) => {
    if (!mountedRef.current) return;

    if (isRefresh && (loadingRef.current || refreshingRef.current)) {
      return;
    }

    if (!isRefresh && loadingRef.current) {
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

    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const [infoResponse, transfersResponse] = await Promise.all([
        fetch('/api/info', { signal: controller.signal }),
        fetch('/api/transfers', { signal: controller.signal }),
      ]);

      const infoData = await parseJsonResponse<TokenInfo>(infoResponse);
  const transfersData = await parseJsonResponse<RawTransfer[]>(transfersResponse);

      if (!mountedRef.current) {
        return;
      }

      setInfo(infoData);
      const normalizedTransfers = mapTransfers(transfersData).sort(
        (a, b) => Number(b.timeStamp) - Number(a.timeStamp)
      );
      setTransfers(normalizedTransfers);
      assignProStats();
      setLastUpdated(Date.now());
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
      window.clearTimeout(timeoutId);
      if (!mountedRef.current) return;

      if (isRefresh) {
        setRefreshing(false);
      } else {
        setLoading(false);
      }

      abortRef.current = null;
    }
  }, [assignProStats, setLoading, setRefreshing]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const refresh = useCallback(async () => {
    await fetchData({ isRefresh: true });
  }, [fetchData]);

  return {
    info,
    transfers,
    stats,
    loading: loadingState,
    refreshing: refreshingState,
    error,
    refresh,
    lastUpdated,
  };
};
