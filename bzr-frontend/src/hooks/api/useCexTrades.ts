import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import type { CexTradesResponse } from '../../types/api';
import { API_BASE_URL } from '../../utils/api';

interface UseCexTradesParams {
  exchangeId?: string;
  symbol?: string;
  page: number;
  pageSize: number;
  sort?: 'asc' | 'desc';
}

const fetchCexTrades = async ({ exchangeId, symbol, page, pageSize, sort = 'desc' }: UseCexTradesParams) => {
  const params: Record<string, string | number> = { page, pageSize, sort };
  if (exchangeId) params.exchangeId = exchangeId;
  if (symbol) params.symbol = symbol;

  const { data } = await axios.get<CexTradesResponse>(`${API_BASE_URL}/api/cex/trades`, { params });
  return data;
};

export const useCexTrades = (params: UseCexTradesParams) => {
  return useQuery<CexTradesResponse, Error>({
    queryKey: [
      'cex-trades',
      params.exchangeId ?? '',
      params.symbol ?? '',
      params.page,
      params.pageSize,
      params.sort ?? 'desc',
    ],
    queryFn: () => fetchCexTrades(params),
    staleTime: 10_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });
};

