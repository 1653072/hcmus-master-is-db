import { create } from 'zustand';
import type { CartItem } from '@/lib/types';

type CartState = {
  items: CartItem[];
  totalPrice: number;
  checkoutItems: CartItem[];
  checkoutSessionId: string | null;
  setCart: (items: CartItem[], totalPrice: number) => void;
  setCheckoutItems: (items: CartItem[], sessionId?: string | null) => void;
  updateCheckoutItemQuantity: (bookId: string, quantity: number) => void;
  clearCart: () => void;
};

export const useCartStore = create<CartState>((set) => ({
  items: [],
  totalPrice: 0,
  checkoutItems: [],
  checkoutSessionId: null,
  setCart: (items, totalPrice) => set({ items, totalPrice }),
  setCheckoutItems: (items, sessionId = null) => set({ checkoutItems: items, checkoutSessionId: sessionId }),
  updateCheckoutItemQuantity: (bookId, quantity) =>
    set((state) => ({
      checkoutItems:
        quantity < 1
          ? state.checkoutItems.filter((i) => i.book_id !== bookId)
          : state.checkoutItems.map((i) => (i.book_id === bookId ? { ...i, quantity } : i)),
    })),
  clearCart: () => set({ items: [], totalPrice: 0, checkoutItems: [], checkoutSessionId: null }),
}));
