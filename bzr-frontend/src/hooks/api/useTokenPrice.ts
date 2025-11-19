import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import type { TokenPriceResponse } from '../../types/api';

const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';

const fetchTokenPrice = async () => {
  const { data } = await axios.get<TokenPriceResponse>(`${API_BASE_URL}/api/token-price`);
  return data;
};

export const useTokenPrice = () => {
  return useQuery({
    queryKey: ['tokenPrice'],
    queryFn: fetchTokenPrice,
  });
};
