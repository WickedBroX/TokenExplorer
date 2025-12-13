import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import type { CexMarketsResponse } from '../../types/api';
import { API_BASE_URL } from '../../utils/api';

const fetchCexMarkets = async () => {
  const { data } = await axios.get<CexMarketsResponse>(`${API_BASE_URL}/api/cex/markets`);
  return data;
};

export const useCexMarkets = () => {
  return useQuery<CexMarketsResponse, Error>({
    queryKey: ['cex-markets'],
    queryFn: fetchCexMarkets,
    staleTime: 60_000,
    gcTime: 10 * 60_000,
    refetchOnWindowFocus: false,
  });
};

