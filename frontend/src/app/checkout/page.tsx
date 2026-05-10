'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo } from 'react';
import { Minus, Plus } from 'lucide-react';

import { RouteShell } from '@/components/layout/RouteShell';
import { Button } from '@/components/ui/button';
import { useCartStore } from '@/stores/cart.store';

function formatPrice(value: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
}

export default function Page() {
  const router = useRouter();
  const checkoutItems = useCartStore((s) => s.checkoutItems);
  const updateCheckoutItemQuantity = useCartStore((s) => s.updateCheckoutItemQuantity);

  useEffect(() => {
    if (checkoutItems.length === 0) {
      router.push('/cart');
    }
  }, [checkoutItems, router]);

  const subtotal = useMemo(() => checkoutItems.reduce((acc, item) => acc + item.price * item.quantity, 0), [checkoutItems]);
  const shipping = subtotal > 0 ? 4 : 0;
  const grandTotal = subtotal + shipping;

  if (checkoutItems.length === 0) {
    return null;
  }

  return (
    <RouteShell title="Checkout" subtitle="Confirm your details and place your order in one calm step.">
      <section className="mx-auto max-w-page px-6 pb-16 pt-0 lg:px-10 xl:px-24">
        <div className="grid gap-6 lg:grid-cols-[1fr_0.42fr]">
          <form className="space-y-4 rounded-cards-lg border border-stone-surface bg-white p-5" style={{ boxShadow: 'var(--shadow-sm)' }}>
            <div className="h-1.5 w-14 rounded-full bg-ember/20" aria-hidden="true" />
            <div className="grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.28em] text-ash">Full name</span>
                <input className="w-full rounded-full border border-stone-surface bg-parchment px-4 py-3 text-sm outline-none transition placeholder:text-smoke focus:border-ember focus:bg-white focus:ring-2 focus:ring-ember/20" placeholder="Full name" />
              </label>
              <label className="block">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.28em] text-ash">Phone</span>
                <input className="w-full rounded-full border border-stone-surface bg-parchment px-4 py-3 text-sm outline-none transition placeholder:text-smoke focus:border-ember focus:bg-white focus:ring-2 focus:ring-ember/20" placeholder="Phone" />
              </label>
            </div>
            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.28em] text-ash">Address</span>
              <input className="w-full rounded-full border border-stone-surface bg-parchment px-4 py-3 text-sm outline-none transition placeholder:text-smoke focus:border-ember focus:bg-white focus:ring-2 focus:ring-ember/20" placeholder="Address" />
            </label>
            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.28em] text-ash">Note</span>
              <textarea className="min-h-32 w-full rounded-[22px] border border-stone-surface bg-parchment px-4 py-3 text-sm outline-none transition placeholder:text-smoke focus:border-ember focus:bg-white focus:ring-2 focus:ring-ember/20" placeholder="Note" />
            </label>
          </form>

          <aside className="rounded-cards-lg border border-stone-surface bg-parchment p-5 h-fit" style={{ boxShadow: 'var(--shadow-sm)' }}>
            <div className="h-1.5 w-14 rounded-full bg-ember/20" aria-hidden="true" />
            <h2 className="mt-3 font-display text-[clamp(1.75rem,3vw,2.1rem)] leading-[1.05] tracking-[-0.02em] text-charcoal">Payment summary</h2>
            
            <div className="mt-6 space-y-4 border-b border-stone-surface pb-4">
              {checkoutItems.map((item) => (
                <div key={item.book_id} className="flex justify-between text-sm">
                  <div className="min-w-0 flex-1 pr-4">
                    <span className="text-charcoal truncate block">{item.name}</span>
                    <div className="mt-2 flex items-center gap-2 w-fit rounded-full border border-stone-surface bg-white px-2 py-1">
                      <button type="button" onClick={() => updateCheckoutItemQuantity(item.book_id, item.quantity - 1)} className="flex h-5 w-5 items-center justify-center rounded-full bg-parchment text-graphite hover:bg-stone-surface transition-colors">
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="w-4 text-center text-xs font-medium text-charcoal">{item.quantity}</span>
                      <button type="button" onClick={() => updateCheckoutItemQuantity(item.book_id, item.quantity + 1)} className="flex h-5 w-5 items-center justify-center rounded-full bg-parchment text-graphite hover:bg-stone-surface transition-colors">
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                  <span className="text-graphite shrink-0 font-medium">{formatPrice(item.price * item.quantity)}</span>
                </div>
              ))}
            </div>

            <div className="mt-4 space-y-3 text-sm text-graphite">
              <div className="flex justify-between"><span>Subtotal</span><span>{formatPrice(subtotal)}</span></div>
              <div className="flex justify-between"><span>Shipping</span><span>{formatPrice(shipping)}</span></div>
              <div className="flex justify-between border-t border-stone-surface pt-3 font-semibold text-charcoal"><span>Total</span><span>{formatPrice(grandTotal)}</span></div>
            </div>
            <Button className="mt-6 w-full">
              Place order
            </Button>
          </aside>
        </div>
      </section>
    </RouteShell>
  );
}
