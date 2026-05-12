import { apiClient } from './client';
import type { Address, CreateAddressRequest } from '@/lib/types';

export const addressesApi = {
  list: async () => {
    const { data } = await apiClient.get<{ data: Address[] }>('/users/addresses');
    return data.data;
  },
  create: async (payload: CreateAddressRequest) => {
    const { data } = await apiClient.post<{ data: Address }>('/users/addresses', payload);
    return data.data;
  },
};
