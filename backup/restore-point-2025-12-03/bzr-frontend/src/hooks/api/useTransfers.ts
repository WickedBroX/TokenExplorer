import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import type { TransfersResponse, Transfer } from '../../types/api';

interface UseTransfersParams {
  chainId: number;
  page: number;
  pageSize: number;
  sort?: 'asc' | 'desc';
  address?: string;
  block?: string;
  hash?: string;
}

const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';

const fetchTransfers = async ({ chainId, page, pageSize, sort = 'desc', address, block, hash }: UseTransfersParams) => {
  const params: Record<string, string | number | boolean> = {
    chainId: chainId,
    page,
    pageSize,
    sort,
    includeTotals: true,
  };

  if (address) params.address = address;
  if (block) params.block = block;
  if (hash) params.hash = hash;

  const { data } = await axios.get<TransfersResponse<Transfer>>(`${API_BASE_URL}/api/transfers`, { params });
  return data;
};

export const useTransfers = (params: UseTransfersParams) => {
  return useQuery({
    queryKey: ['transfers', params],
    queryFn: () => fetchTransfers(params),
    staleTime: 0, // Always consider data stale
    gcTime: 0, // Don't cache old queries - immediately garbage collect when query becomes inactive
    refetchOnMount: 'always', // Always refetch when component mounts
  });
};
