import { apiClient } from './client';
import type { ApiListParams, DeactivateUserRequest, SalesSummary, UserListResponse } from '@/lib/types';

export const adminApi = {
  listUsers: async (params?: ApiListParams) => {
    const { data } = await apiClient.get<{ data: any[]; total: number; page: number; page_size: number }>('/admin/users', { params });
    return data;
  },
  getUser: async (id: string) => {
    const { data } = await apiClient.get<{ data: any }>(`/admin/users/${id}`);
    return data.data;
  },
  deactivateUser: async (id: string, payload: DeactivateUserRequest) => {
    const { data } = await apiClient.patch<{ data: any }>(`/admin/users/${id}/deactivate`, payload);
    return data.data;
  },
  bestSellers: async () => {
    const { data } = await apiClient.get<{ data: any }>('/admin/analytics/best-sellers');
    return data.data;
  },
  sales: async (params?: { from?: string; to?: string }) => {
    const { data } = await apiClient.get<{ data: SalesSummary }>('/admin/analytics/sales', { params });
    return data.data;
  },
};
