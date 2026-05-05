import { apiClient } from './client';
import type { AddToCartRequest, CartResponse, UpdateCartItemRequest } from '@/lib/types';

export const cartApi = {
  get: async () => {
    const { data } = await apiClient.get<CartResponse>('/cart');
    return data;
  },
  add: async (payload: AddToCartRequest) => {
    const { data } = await apiClient.post('/cart', payload);
    return data;
  },
  updateItem: async (bookId: string, payload: UpdateCartItemRequest) => {
    const { data } = await apiClient.put(`/cart/${bookId}`, payload);
    return data;
  },
  removeItem: async (bookId: string) => {
    const { data } = await apiClient.delete(`/cart/${bookId}`);
    return data;
  },
};
