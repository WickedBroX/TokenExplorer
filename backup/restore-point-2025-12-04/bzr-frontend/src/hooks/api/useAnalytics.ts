import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import type { AnalyticsResponse } from '../../types/api';

const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';

export type AnalyticsTimeRange = '7d' | '30d' | '90d' | 'all';

const fetchAnalytics = async (timeRange: AnalyticsTimeRange) => {
  const { data } = await axios.get<AnalyticsResponse>(`${API_BASE_URL}/api/analytics`, {
    params: { timeRange }
  });
  return data;
};

export const useAnalytics = (timeRange: AnalyticsTimeRange) => {
  return useQuery({
    queryKey: ['analytics', timeRange],
    queryFn: () => fetchAnalytics(timeRange),
    staleTime: 60 * 1000, // 1 minute
  });
};
