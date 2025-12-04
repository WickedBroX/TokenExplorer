import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import type { TokenStats } from '../../types/api';

const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';

const fetchTokenStats = async () => {
  const { data } = await axios.get<TokenStats>(`${API_BASE_URL}/api/stats`);
  return data;
};

export const useTokenStats = () => {
  return useQuery({
    queryKey: ['tokenStats'],
    queryFn: fetchTokenStats,
  });
};
