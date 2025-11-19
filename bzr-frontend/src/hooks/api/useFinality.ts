import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import type { FinalityResponse } from '../../types/api';

const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';

const fetchFinality = async () => {
  const { data } = await axios.get<FinalityResponse>(`${API_BASE_URL}/api/finality`);
  return data;
};

export const useFinality = () => {
  return useQuery({
    queryKey: ['finality'],
    queryFn: fetchFinality,
  });
};
