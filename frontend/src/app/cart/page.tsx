'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import { RouteShell } from '@/components/layout/RouteShell';
import { Button } from '@/components/ui/button';
import { cartApi } from '@/lib/api/cart';
import type { CartItem } from '@/lib/types';

function formatPrice(value: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
}

export default function Page() {
  const [items, setItems] = useState<CartItem[]>([]);
  const [totalPrice, setTotalPrice] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadCart() {
      try {
        setLoading(true);
        setError(null);
        const res = await cartApi.get();
        if (!mounted) return;
        setItems(res.items ?? []);
        setTotalPrice(res.total_price ?? 0);
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

  const subtotal = useMemo(() => totalPrice, [totalPrice]);
  const shipping = subtotal > 0 ? 4 : 0;
  const grandTotal = subtotal + shipping;

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
              items.map((item, index) => (
                <article key={item.book_id} className="rounded-cards-lg border border-stone-surface bg-white p-4" style={{ boxShadow: 'var(--shadow-sm)' }}>
                  <div className="flex items-center gap-4">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[18px] bg-gradient-to-br from-parchment to-stone-surface font-display text-xl tracking-[-0.02em] text-charcoal">
                      {String(index + 1).padStart(2, '0')}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h2 className="truncate font-display text-[1.2rem] leading-tight tracking-[-0.02em] text-charcoal">{item.name}</h2>
                      <p className="mt-1 text-sm text-graphite">Quantity: {item.quantity}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-charcoal">{formatPrice(item.price)}</p>
                      <p className="text-xs text-ash">Editable</p>
                    </div>
                  </div>
                </article>
              ))
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
            <Button className="mt-6 w-full" asChild>
              <Link href="/checkout">
                Checkout
              </Link>
            </Button>
          </aside>
        </div>
      </section>
    </RouteShell>
  );
}
