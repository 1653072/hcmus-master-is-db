import { apiClient } from './client';
import type { ApiListParams, DeactivateUserRequest, SalesSummary, UserListResponse } from '@/lib/types';

export const adminApi = {
  listUsers: async (params?: ApiListParams) => {
    const { data } = await apiClient.get<UserListResponse>('/admin/users', { params });
    return data;
  },
  getUser: async (id: string) => {
    const { data } = await apiClient.get(`/admin/users/${id}`);
    return data;
  },
  deactivateUser: async (id: string, payload: DeactivateUserRequest) => {
    const { data } = await apiClient.patch(`/admin/users/${id}/deactivate`, payload);
    return data;
  },
  bestSellers: async () => {
    const { data } = await apiClient.get('/admin/analytics/best-sellers');
    return data;
  },
  sales: async () => {
    const { data } = await apiClient.get<SalesSummary>('/admin/analytics/sales');
    return data;
  },
};
