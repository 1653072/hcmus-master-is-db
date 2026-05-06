import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { UserInfo } from '@/lib/types';

type AuthState = {
  token: string | null;
  user: UserInfo | null;
  setAuth: (token: string, user: UserInfo) => void;
  clearAuth: () => void;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      setAuth: (token, user) => set({ token, user }),
      clearAuth: () => {
        if (typeof window !== 'undefined') {
          window.localStorage.removeItem('access_token');
        }
        set({ token: null, user: null });
      },
    }),
    {
      name: 'auth-storage',
    }
  )
);
