import Link from 'next/link';

import { RouteShell } from '@/components/layout/RouteShell';
import { Button } from '@/components/ui/button';

const items = [
  { title: 'The Psychology of Money', price: '$24', qty: 1 },
  { title: 'Atomic Habits', price: '$24', qty: 2 },
];

export default function Page() {
  return (
    <RouteShell title="Your cart" subtitle="Review items before moving to checkout.">
      <section className="mx-auto max-w-page px-6 pb-16 pt-10 lg:px-10 xl:px-24">
        <div className="grid gap-6 lg:grid-cols-[1fr_0.38fr]">
          <div className="space-y-4">
            {items.map((item, index) => (
              <article key={item.title} className="rounded-cards-lg border border-stone-surface bg-white p-4" style={{ boxShadow: 'var(--shadow-sm)' }}>
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[18px] bg-gradient-to-br from-parchment to-stone-surface font-display text-xl tracking-[-0.02em] text-charcoal">
                    {String(index + 1).padStart(2, '0')}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="truncate font-display text-[1.2rem] leading-tight tracking-[-0.02em] text-charcoal">{item.title}</h2>
                    <p className="mt-1 text-sm text-graphite">Quantity: {item.qty}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-charcoal">{item.price}</p>
                    <p className="text-xs text-ash">Editable</p>
                  </div>
                </div>
              </article>
            ))}
          </div>

          <aside className="rounded-cards-lg border border-stone-surface bg-parchment p-5" style={{ boxShadow: 'var(--shadow-sm)' }}>
            <div className="h-1.5 w-14 rounded-full bg-ember/20" aria-hidden="true" />
            <h2 className="mt-3 font-display text-[clamp(1.75rem,3vw,2.1rem)] leading-[1.05] tracking-[-0.02em] text-charcoal">Order summary</h2>
            <div className="mt-4 space-y-3 text-sm text-graphite">
              <div className="flex justify-between"><span>Subtotal</span><span>$72</span></div>
              <div className="flex justify-between"><span>Shipping</span><span>$4</span></div>
              <div className="flex justify-between border-t border-stone-surface pt-3 font-semibold text-charcoal"><span>Total</span><span>$76</span></div>
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
