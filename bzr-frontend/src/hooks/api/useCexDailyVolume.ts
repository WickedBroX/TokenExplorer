import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import type { CexDailyVolumeResponse } from '../../types/api';
import { API_BASE_URL } from '../../utils/api';

interface UseCexDailyVolumeParams {
  exchangeId?: string;
  symbol?: string;
  days?: number;
}

const fetchCexDailyVolume = async ({ exchangeId, symbol, days = 30 }: UseCexDailyVolumeParams) => {
  const params: Record<string, string | number> = { days };
  if (exchangeId) params.exchangeId = exchangeId;
  if (symbol) params.symbol = symbol;

  const { data } = await axios.get<CexDailyVolumeResponse>(`${API_BASE_URL}/api/cex/volume/daily`, { params });
  return data;
};

export const useCexDailyVolume = (params: UseCexDailyVolumeParams) => {
  return useQuery<CexDailyVolumeResponse, Error>({
    queryKey: ['cex-daily-volume', params.exchangeId ?? '', params.symbol ?? '', params.days ?? 30],
    queryFn: () => fetchCexDailyVolume(params),
    staleTime: 60_000,
    gcTime: 10 * 60_000,
    refetchOnWindowFocus: false,
  });
};

