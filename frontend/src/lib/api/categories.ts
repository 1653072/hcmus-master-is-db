import { apiClient } from './client';
import type { ApiListParams, CreateCategoryRequest, UpdateCategoryRequest } from '@/lib/types';

export interface Category {
  id: string;
  category_name: string;
  slug?: string;
  parent_category?: string;
}

type CategoryListResult = {
  data: Category[];
  total: number;
  page: number;
  page_size: number;
};

export const categoriesApi = {
  list: async (params?: ApiListParams) => {
    const { data } = await apiClient.get<CategoryListResult>('/categories', { params });
    return data;
  },
  listAll: async (pageSize = 100) => {
    const categories: Category[] = [];
    let page = 1;
    let total = 0;

    do {
      const res = await categoriesApi.list({ page, page_size: pageSize });
      const list = Array.isArray(res.data) ? res.data : [];
      categories.push(...list);
      total = Number(res.total ?? categories.length);
      page += 1;

      if (list.length === 0) break;
    } while (categories.length < total);

    return categories;
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
