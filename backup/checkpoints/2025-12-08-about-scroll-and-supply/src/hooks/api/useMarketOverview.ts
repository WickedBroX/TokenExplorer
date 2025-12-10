import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import type { MarketOverview } from '../../types/api';
import { API_BASE_URL } from '../../utils/api';

const fetchMarketOverview = async () => {
  const { data } = await axios.get<MarketOverview>(`${API_BASE_URL}/api/market/overview`);
  return data;
};

export const useMarketOverview = () => {
  return useQuery({
    queryKey: ['marketOverview'],
    queryFn: fetchMarketOverview,
    staleTime: 60_000,
    refetchInterval: 60_000,
  });
};
