import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import type { HoldersResponse } from '../../types/api';
import { API_BASE_URL } from '../../utils/api';

interface UseHoldersParams {
  chainId: number;
  page: number;
  pageSize: number;
  search?: string;
}

const fetchHolders = async ({ chainId, page, pageSize, search }: UseHoldersParams) => {
  const { data } = await axios.get<HoldersResponse>(`${API_BASE_URL}/api/holders`, {
    params: { chainId, page, pageSize, search: search || undefined },
  });
  return data;
};

export const useHolders = (params: UseHoldersParams) => {
  return useQuery<HoldersResponse, Error>({
    queryKey: ['holders', params.chainId, params.page, params.pageSize, params.search || ''],
    queryFn: () => fetchHolders(params),
    staleTime: 60_000, // keep data warm for 1 minute
    gcTime: 5 * 60_000, // retain cache for quick backfill when switching chains/pages
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    placeholderData: undefined,
  });
};
