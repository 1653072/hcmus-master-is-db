import { apiClient } from './client';
import type {
  ApiListParams,
  BookListResponse,
  BookDetail,
  CreateBookRequest,
  UpdateBookRequest,
  UpdateStockRequest,
} from '@/lib/types';

export const booksApi = {
  search: async (params?: ApiListParams) => {
    const { data } = await apiClient.get<{ data: any[]; total: number; page: number; page_size: number }>('/books', { params });
    return data;
  },
  getNewBooks: async () => {
    const { data } = await apiClient.get<{ data: BookDetail[] }>('/books/new');
    return data.data;
  },
  getDetail: async (id: string) => {
    const { data } = await apiClient.get<{ data: BookDetail }>(`/books/${id}`);
    return data.data;
  },
  getSimilar: async (id: string) => {
    const { data } = await apiClient.get<{ data: any }>(`/books/${id}/similar`);
    return data.data;
  },
  getSeries: async (id: string) => {
    const { data } = await apiClient.get<{ data: any }>(`/books/${id}/series`);
    return data.data;
  },
  adminList: async (params?: ApiListParams) => {
    const { data } = await apiClient.get<{ data: any[]; total: number; page: number; page_size: number }>('/admin/books', { params });
    return data;
  },
  adminCreate: async (payload: CreateBookRequest) => {
    const { data } = await apiClient.post<{ data: any }>('/admin/books', payload);
    return data.data;
  },
  adminUpdate: async (id: string, payload: UpdateBookRequest) => {
    const { data } = await apiClient.put<{ data: any }>(`/admin/books/${id}`, payload);
    return data.data;
  },
  adminDelete: async (id: string) => {
    const { data } = await apiClient.delete<{ data: any }>(`/admin/books/${id}`);
    return data.data;
  },
  adminUpdateStock: async (id: string, payload: UpdateStockRequest) => {
    const { data } = await apiClient.patch<{ data: any }>(`/admin/books/${id}/stock`, payload);
    return data.data;
  },
};
