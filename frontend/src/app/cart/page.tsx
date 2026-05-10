'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Check, Minus, Plus } from 'lucide-react';
import { toast } from 'sonner';

import { useRouter } from 'next/navigation';

import { RouteShell } from '@/components/layout/RouteShell';
import { Button } from '@/components/ui/button';
import { cartApi } from '@/lib/api/cart';
import type { CartItem } from '@/lib/types';
import { useCartStore } from '@/stores/cart.store';

function formatPrice(value: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
}

export default function Page() {
  const [items, setItems] = useState<CartItem[]>([]);
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const setCheckoutItems = useCartStore((s) => s.setCheckoutItems);

  useEffect(() => {
    let mounted = true;

    async function loadCart() {
      try {
        setLoading(true);
        setError(null);
        const res = await cartApi.get();
        if (!mounted) return;
        setItems(res.items ?? []);
        // Auto-select all items initially
        setSelectedItemIds(new Set((res.items ?? []).map((i) => i.book_id)));
      } catch (err) {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : 'Failed to load cart');
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadCart();
    return () => {
      mounted = false;
    };
  }, []);

  const toggleSelection = (id: string) => {
    setSelectedItemIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const updateQuantity = async (bookId: string, newQuantity: number) => {
    if (newQuantity < 1) {
      try {
        setUpdatingId(bookId);
        await cartApi.removeItem(bookId);
        setItems((prev) => prev.filter((i) => i.book_id !== bookId));
        setSelectedItemIds((prev) => {
          const next = new Set(prev);
          next.delete(bookId);
          return next;
        });
      } catch (err) {
        toast.error('Failed to remove item');
      } finally {
        setUpdatingId(null);
      }
      return;
    }

    try {
      setUpdatingId(bookId);
      await cartApi.updateItem(bookId, { quantity: newQuantity });
      setItems((prev) => prev.map((i) => (i.book_id === bookId ? { ...i, quantity: newQuantity } : i)));
    } catch (err) {
      toast.error('Failed to update quantity');
    } finally {
      setUpdatingId(null);
    }
  };

  const selectedItems = useMemo(() => items.filter((item) => selectedItemIds.has(item.book_id)), [items, selectedItemIds]);
  const subtotal = useMemo(() => selectedItems.reduce((acc, item) => acc + item.price * item.quantity, 0), [selectedItems]);
  const shipping = subtotal > 0 ? 4 : 0;
  const grandTotal = subtotal + shipping;

  const handleCheckout = () => {
    setCheckoutItems(selectedItems);
    router.push('/checkout');
  };

  return (
    <RouteShell title="Your cart" subtitle="Review items before moving to checkout.">
      <section className="mx-auto max-w-page px-6 pb-16 pt-10 lg:px-10 xl:px-24">
        <div className="grid gap-6 lg:grid-cols-[1fr_0.38fr]">
          <div className="space-y-4">
            {loading ? (
              <div className="rounded-cards-lg border border-stone-surface bg-white p-6 text-sm text-graphite" style={{ boxShadow: 'var(--shadow-sm)' }}>
                Loading cart...
              </div>
            ) : error ? (
              <div className="rounded-cards-lg border border-coral-red/20 bg-coral-red/5 p-6 text-coral-red" style={{ boxShadow: 'var(--shadow-sm)' }}>
                <p className="font-semibold">Unable to load cart</p>
                <p className="mt-2 text-sm text-graphite">{error}</p>
              </div>
            ) : items.length === 0 ? (
              <div className="rounded-cards-lg border border-dashed border-stone-surface bg-parchment p-12 text-center text-sm text-graphite">
                Your cart is empty.
              </div>
            ) : (
              items.map((item, index) => {
                const isSelected = selectedItemIds.has(item.book_id);
                const isUpdating = updatingId === item.book_id;
                return (
                  <article key={item.book_id} className={`rounded-cards-lg border p-4 transition ${isSelected ? 'border-ember/50 bg-white' : 'border-stone-surface bg-parchment/50'} ${isUpdating ? 'opacity-50 pointer-events-none' : ''}`} style={{ boxShadow: 'var(--shadow-sm)' }}>
                    <div className="flex items-center gap-4">
                      <button
                        type="button"
                        onClick={() => toggleSelection(item.book_id)}
                        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border transition-colors ${
                          isSelected ? 'border-ember bg-ember text-white' : 'border-stone-surface bg-white text-transparent'
                        }`}
                      >
                        <Check className="h-4 w-4" />
                      </button>
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[18px] bg-gradient-to-br from-parchment to-stone-surface font-display text-xl tracking-[-0.02em] text-charcoal">
                        {String(index + 1).padStart(2, '0')}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h2 className="truncate font-display text-[1.2rem] leading-tight tracking-[-0.02em] text-charcoal">{item.name}</h2>
                        <div className="mt-2 flex items-center gap-2 w-fit rounded-full border border-stone-surface bg-parchment px-2 py-1">
                          <button type="button" onClick={() => updateQuantity(item.book_id, item.quantity - 1)} className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-graphite hover:bg-stone-surface transition-colors">
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="w-6 text-center text-sm font-medium text-charcoal">{item.quantity}</span>
                          <button type="button" onClick={() => updateQuantity(item.book_id, item.quantity + 1)} className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-graphite hover:bg-stone-surface transition-colors">
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-charcoal">{formatPrice(item.price)}</p>
                      </div>
                    </div>
                  </article>
                );
              })
            )}
          </div>

          <aside className="rounded-cards-lg border border-stone-surface bg-parchment p-5" style={{ boxShadow: 'var(--shadow-sm)' }}>
            <div className="h-1.5 w-14 rounded-full bg-ember/20" aria-hidden="true" />
            <h2 className="mt-3 font-display text-[clamp(1.75rem,3vw,2.1rem)] leading-[1.05] tracking-[-0.02em] text-charcoal">Order summary</h2>
            <div className="mt-4 space-y-3 text-sm text-graphite">
              <div className="flex justify-between"><span>Subtotal</span><span>{formatPrice(subtotal)}</span></div>
              <div className="flex justify-between"><span>Shipping</span><span>{formatPrice(shipping)}</span></div>
              <div className="flex justify-between border-t border-stone-surface pt-3 font-semibold text-charcoal"><span>Total</span><span>{formatPrice(grandTotal)}</span></div>
            </div>
            <Button className="mt-6 w-full" onClick={handleCheckout} disabled={selectedItems.length === 0}>
              Checkout
            </Button>
          </aside>
        </div>
      </section>
    </RouteShell>
  );
}
