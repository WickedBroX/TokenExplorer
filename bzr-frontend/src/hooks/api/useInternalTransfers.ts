import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import type { InternalTransfersResponse } from '../../types/api';
import { API_BASE_URL } from '../../utils/api';

interface UseInternalTransfersParams {
  chainId: number;
  page: number;
  pageSize: number;
  sort?: 'asc' | 'desc';
  address?: string;
}

const fetchInternalTransfers = async ({
  chainId,
  page,
  pageSize,
  sort = 'desc',
  address,
}: UseInternalTransfersParams) => {
  const params: Record<string, string | number> = {
    chainId,
    page,
    pageSize,
    sort,
  };
  if (address) params.address = address;

  const { data } = await axios.get<InternalTransfersResponse>(
    `${API_BASE_URL}/api/internal-transfers`,
    { params }
  );
  return data;
};

export const useInternalTransfers = (params: UseInternalTransfersParams) => {
  return useQuery<InternalTransfersResponse, Error>({
    queryKey: [
      'internal-transfers',
      params.chainId,
      params.page,
      params.pageSize,
      params.sort ?? 'desc',
      params.address ?? '',
    ],
    queryFn: () => fetchInternalTransfers(params),
    staleTime: 15_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });
};

