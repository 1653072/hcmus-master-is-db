import { apiClient } from './client';
import type { AddToCartRequest, CartResponse, UpdateCartItemRequest } from '@/lib/types';

export const cartApi = {
  get: async () => {
    const { data } = await apiClient.get<{ data: CartResponse }>('/cart');
    return data.data;
  },
  add: async (payload: AddToCartRequest) => {
    const { data } = await apiClient.post<{ data: any }>('/cart', payload);
    return data.data;
  },
  updateItem: async (bookId: string, payload: UpdateCartItemRequest) => {
    const { data } = await apiClient.put<{ data: any }>(`/cart/${bookId}`, payload);
    return data.data;
  },
  removeItem: async (bookId: string) => {
    const { data } = await apiClient.delete<{ data: any }>(`/cart/${bookId}`);
    return data.data;
  },
};

