import { create } from 'zustand';
import type { CartItem } from '@/lib/types';

type CartState = {
  items: CartItem[];
  totalPrice: number;
  setCart: (items: CartItem[], totalPrice: number) => void;
  clearCart: () => void;
};

export const useCartStore = create<CartState>((set) => ({
  items: [],
  totalPrice: 0,
  setCart: (items, totalPrice) => set({ items, totalPrice }),
  clearCart: () => set({ items: [], totalPrice: 0 }),
}));
