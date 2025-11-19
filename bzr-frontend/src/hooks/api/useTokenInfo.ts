import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import type { TokenInfo } from '../../types/api';

const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';

const fetchTokenInfo = async () => {
  const { data } = await axios.get<TokenInfo>(`${API_BASE_URL}/api/info`);
  return data;
};

export const useTokenInfo = () => {
  return useQuery({
    queryKey: ['tokenInfo'],
    queryFn: fetchTokenInfo,
    staleTime: 12 * 60 * 60 * 1000, // 12 hours
  });
};
