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
    const { data } = await apiClient.get<BookListResponse>('/books', { params });
    return data;
  },
  getNewBooks: async () => {
    const { data } = await apiClient.get<BookDetail[]>('/books/new');
    return data;
  },
  getDetail: async (id: string) => {
    const { data } = await apiClient.get<BookDetail>(`/books/${id}`);
    return data;
  },
  getSimilar: async (id: string) => {
    const { data } = await apiClient.get(`/books/${id}/similar`);
    return data;
  },
  getSeries: async (id: string) => {
    const { data } = await apiClient.get(`/books/${id}/series`);
    return data;
  },
  adminList: async (params?: ApiListParams) => {
    const { data } = await apiClient.get<BookListResponse>('/admin/books', { params });
    return data;
  },
  adminCreate: async (payload: CreateBookRequest) => {
    const { data } = await apiClient.post('/admin/books', payload);
    return data;
  },
  adminUpdate: async (id: string, payload: UpdateBookRequest) => {
    const { data } = await apiClient.put(`/admin/books/${id}`, payload);
    return data;
  },
  adminDelete: async (id: string) => {
    const { data } = await apiClient.delete(`/admin/books/${id}`);
    return data;
  },
  adminUpdateStock: async (id: string, payload: UpdateStockRequest) => {
    const { data } = await apiClient.patch(`/admin/books/${id}/stock`, payload);
    return data;
  },
};
