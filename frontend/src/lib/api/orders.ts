import { apiClient } from './client';
import type { BuyNowRequest, BuyNowResponse, CheckoutRequest, OrderListResponse, UpdateOrderStatusRequest } from '@/lib/types';

export const ordersApi = {
  checkout: async (payload: CheckoutRequest) => {
    const { data } = await apiClient.post('/orders/checkout', payload);
    return data;
  },
  buyNow: async (payload: BuyNowRequest) => {
    const { data } = await apiClient.post<BuyNowResponse>('/orders/buy-now', payload);
    return data;
  },
  history: async () => {
    const { data } = await apiClient.get<OrderListResponse>('/orders');
    return data;
  },
  detail: async (id: string) => {
    const { data } = await apiClient.get(`/orders/${id}`);
    return data;
  },
  adminList: async () => {
    const { data } = await apiClient.get<OrderListResponse>('/admin/orders');
    return data;
  },
  adminGet: async (id: string) => {
    const { data } = await apiClient.get(`/admin/orders/${id}`);
    return data;
  },
  adminUpdateStatus: async (id: string, payload: UpdateOrderStatusRequest) => {
    const { data } = await apiClient.patch(`/admin/orders/${id}/status`, payload);
    return data;
  },
  adminHistory: async (id: string) => {
    const { data } = await apiClient.get(`/admin/orders/${id}/history`);
    return data;
  },
};
