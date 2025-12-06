import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import type { TokenPriceResponse } from '../../types/api';
import { API_BASE_URL } from '../../utils/api';

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
