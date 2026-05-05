import { apiClient } from './client';
import type { LoginRequest, LoginResponse, RegisterRequest } from '@/lib/types';

export const authApi = {
  register: async (payload: RegisterRequest) => {
    const { data } = await apiClient.post('/auth/register', payload);
    return data;
  },
  login: async (payload: LoginRequest) => {
    const { data } = await apiClient.post<LoginResponse>('/auth/login', payload);
    return data;
  },
  logout: async () => {
    const { data } = await apiClient.post('/auth/logout');
    return data;
  },
};
