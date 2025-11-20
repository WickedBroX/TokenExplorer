import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import type { HoldersResponse } from '../../types/api';

interface UseHoldersParams {
  chainId: number;
  page: number;
  pageSize: number;
}

const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';

const fetchHolders = async ({ chainId, page, pageSize }: UseHoldersParams) => {
  const { data } = await axios.get<HoldersResponse>(`${API_BASE_URL}/api/holders`, {
    params: { chainId, page, pageSize },
  });
  return data;
};

export const useHolders = (params: UseHoldersParams) => {
  return useQuery({
    queryKey: ['holders', params],
    queryFn: () => fetchHolders(params),
    staleTime: 0, // Always consider data stale
    gcTime: 0, // Don't cache old queries - immediately garbage collect when query becomes inactive
    refetchOnMount: 'always', // Always refetch when component mounts
  });
};
