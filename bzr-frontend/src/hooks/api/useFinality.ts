import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import type { FinalityResponse } from '../../types/api';
import { API_BASE_URL } from '../../utils/api';

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
