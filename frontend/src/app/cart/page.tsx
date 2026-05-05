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
      <section className="mx-auto max-w-[1280px] px-6 pb-16 pt-0 lg:px-10 xl:px-14">
        <div className="grid gap-6 lg:grid-cols-[1fr_0.38fr]">
          <div className="space-y-4">
            {items.map((item, index) => (
              <article key={item.title} className="rounded-[28px] border border-stone-200 bg-white/85 p-4 shadow-[0_10px_28px_rgba(68,53,33,0.06)]">
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[18px] bg-gradient-to-br from-stone-100 to-amber-50 font-display text-xl tracking-[-0.02em] text-zinc-700">
                    {String(index + 1).padStart(2, '0')}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="truncate font-display text-[1.2rem] leading-tight tracking-[-0.02em] text-zinc-900">{item.title}</h2>
                    <p className="mt-1 text-sm text-zinc-600">Quantity: {item.qty}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-zinc-900">{item.price}</p>
                    <p className="text-xs text-zinc-500">Editable</p>
                  </div>
                </div>
              </article>
            ))}
          </div>

          <aside className="rounded-[28px] border border-stone-200 bg-stone-50/80 p-5 shadow-[0_10px_28px_rgba(68,53,33,0.05)]">
            <div className="h-1.5 w-14 rounded-full bg-orange-200" aria-hidden="true" />
            <h2 className="mt-3 font-display text-[clamp(1.75rem,3vw,2.1rem)] leading-[1.05] tracking-[-0.02em] text-zinc-900">Order summary</h2>
            <div className="mt-4 space-y-3 text-sm text-zinc-600">
              <div className="flex justify-between"><span>Subtotal</span><span>$72</span></div>
              <div className="flex justify-between"><span>Shipping</span><span>$4</span></div>
              <div className="flex justify-between border-t border-stone-200 pt-3 font-semibold text-zinc-900"><span>Total</span><span>$76</span></div>
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
