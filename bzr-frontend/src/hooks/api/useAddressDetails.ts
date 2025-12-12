import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import type { AddressDetailsResponse } from '../../types/api';
import { API_BASE_URL } from '../../utils/api';

const fetchAddressDetails = async (address: string) => {
  const { data } = await axios.get<AddressDetailsResponse>(
    `${API_BASE_URL}/api/address/${address}`
  );
  return data;
};

export const useAddressDetails = (address: string) => {
  const normalized = address?.toLowerCase() ?? '';
  return useQuery({
    queryKey: ['address', normalized],
    queryFn: () => fetchAddressDetails(normalized),
    enabled: Boolean(normalized),
    staleTime: 30_000,
    gcTime: 5 * 60_000,
  });
};

