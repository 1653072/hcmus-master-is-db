import { apiClient } from './client';
import type { ApiListParams, CategoryListResponse, CreateCategoryRequest, UpdateCategoryRequest } from '@/lib/types';

export const categoriesApi = {
  list: async (params?: ApiListParams) => {
    const { data } = await apiClient.get<{ data: any[]; total: number; page: number; page_size: number }>('/categories', { params });
    return data;
  },
  adminList: async (params?: ApiListParams) => {
    const { data } = await apiClient.get<{ data: any[]; total: number; page: number; page_size: number }>('/admin/categories', { params });
    return data;
  },
  adminCreate: async (payload: CreateCategoryRequest) => {
    const { data } = await apiClient.post<{ data: any }>('/admin/categories', payload);
    return data.data;
  },
  adminUpdate: async (id: string, payload: UpdateCategoryRequest) => {
    const { data } = await apiClient.put<{ data: any }>(`/admin/categories/${id}`, payload);
    return data.data;
  },
  adminDelete: async (id: string) => {
    const { data } = await apiClient.delete<{ data: any }>(`/admin/categories/${id}`);
    return data.data;
  },
};
