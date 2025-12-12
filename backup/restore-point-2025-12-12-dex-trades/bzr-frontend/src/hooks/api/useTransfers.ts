import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import type { TransfersResponse, Transfer } from '../../types/api';
import { API_BASE_URL } from '../../utils/api';

interface UseTransfersParams {
  chainId: number;
  page: number;
  pageSize: number;
  sort?: 'asc' | 'desc';
  address?: string;
  block?: string;
  hash?: string;
}

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
    // Use a stable key so caching works predictably across renders.
    queryKey: [
      'transfers',
      params.chainId,
      params.page,
      params.pageSize,
      params.sort ?? 'desc',
      params.address ?? '',
      params.block ?? '',
      params.hash ?? '',
    ],
    queryFn: () => fetchTransfers(params),
    // Transfers can tolerate a short cache window to avoid refetching on every tab/page revisit.
    staleTime: 15_000,
    gcTime: 5 * 60_000,
  });
};
