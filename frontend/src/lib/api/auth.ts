import { apiClient } from './client';
import type { LoginRequest, LoginResponse, RegisterRequest, UserInfo } from '@/lib/types';

export const authApi = {
  register: async (payload: RegisterRequest) => {
    const { data } = await apiClient.post<{ data: UserInfo }>('/auth/register', payload);
    return data.data;
  },
  login: async (payload: LoginRequest) => {
    const { data } = await apiClient.post<{ data: LoginResponse }>('/auth/login', payload);
    return data.data;
  },
  logout: async () => {
    const { data } = await apiClient.post<{ data: any }>('/auth/logout');
    return data.data;
  },
};
