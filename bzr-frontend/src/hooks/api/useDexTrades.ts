import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import type { DexTradesResponse } from '../../types/api';
import { API_BASE_URL } from '../../utils/api';

interface UseDexTradesParams {
  chainId: number;
  page: number;
  pageSize: number;
  sort?: 'asc' | 'desc';
  address?: string;
  pool?: string;
  hash?: string;
}

const fetchDexTrades = async ({
  chainId,
  page,
  pageSize,
  sort = 'desc',
  address,
  pool,
  hash,
}: UseDexTradesParams) => {
  const params: Record<string, string | number> = {
    chainId,
    page,
    pageSize,
    sort,
  };

  if (address) params.address = address;
  if (pool) params.pool = pool;
  if (hash) params.hash = hash;

  const { data } = await axios.get<DexTradesResponse>(
    `${API_BASE_URL}/api/dex-trades`,
    { params }
  );
  return data;
};

export const useDexTrades = (params: UseDexTradesParams) => {
  return useQuery<DexTradesResponse, Error>({
    queryKey: [
      'dex-trades',
      params.chainId,
      params.page,
      params.pageSize,
      params.sort ?? 'desc',
      params.address ?? '',
      params.pool ?? '',
      params.hash ?? '',
    ],
    queryFn: () => fetchDexTrades(params),
    staleTime: 15_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });
};

