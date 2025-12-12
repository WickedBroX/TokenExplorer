import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import type { TokenInfo } from '../../types/api';
import { API_BASE_URL } from '../../utils/api';

const fetchTokenInfo = async () => {
  // Cache-bust to avoid serving stale supply numbers from any intermediary cache/CDN
  const { data } = await axios.get<TokenInfo>(`${API_BASE_URL}/api/info`, {
    params: { cb: Date.now() },
  });
  return data;
};

export const useTokenInfo = () => {
  return useQuery<TokenInfo>({
    queryKey: ['tokenInfo', 'v3'],
    queryFn: fetchTokenInfo,
    // Force re-fetch on mount to avoid stale cached supply values.
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnReconnect: 'always',
  });
};
