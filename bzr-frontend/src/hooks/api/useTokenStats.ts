import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import type { TokenStats } from '../../types/api';
import { API_BASE_URL } from '../../utils/api';

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
