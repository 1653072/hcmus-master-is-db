import { apiClient } from './client';
import type { ApiListParams, CategoryListResponse, CreateCategoryRequest, UpdateCategoryRequest } from '@/lib/types';

export const categoriesApi = {
  list: async (params?: ApiListParams) => {
    const { data } = await apiClient.get<CategoryListResponse>('/categories', { params });
    return data;
  },
  adminList: async (params?: ApiListParams) => {
    const { data } = await apiClient.get<CategoryListResponse>('/admin/categories', { params });
    return data;
  },
  adminCreate: async (payload: CreateCategoryRequest) => {
    const { data } = await apiClient.post('/admin/categories', payload);
    return data;
  },
  adminUpdate: async (id: string, payload: UpdateCategoryRequest) => {
    const { data } = await apiClient.put(`/admin/categories/${id}`, payload);
    return data;
  },
  adminDelete: async (id: string) => {
    const { data } = await apiClient.delete(`/admin/categories/${id}`);
    return data;
  },
};
