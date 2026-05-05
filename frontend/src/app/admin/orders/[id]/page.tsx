import Link from 'next/link';

import { RouteShell } from '@/components/layout/RouteShell';

const items = [
  { title: 'The Psychology of Money', qty: 1, price: '$24' },
  { title: 'Atomic Habits', qty: 2, price: '$24' },
];

export default function Page() {
  return (
    <RouteShell title="Order detail" subtitle="Review fulfillment, items, and payment status for a single order.">
      <section className="mx-auto max-w-[1280px] px-6 pb-16 pt-0 lg:px-10 xl:px-14">
        <div className="grid gap-6 lg:grid-cols-[1fr_0.42fr]">
          <div className="space-y-4 rounded-[28px] border border-stone-200 bg-white/85 p-6 shadow-[0_10px_28px_rgba(68,53,33,0.06)]">
            {items.map((item) => (
              <article key={item.title} className="flex items-center justify-between gap-4 rounded-[22px] border border-stone-200 bg-stone-50/70 px-4 py-4">
                <div>
                  <h2 className="font-display text-[1.2rem] leading-tight tracking-[-0.02em] text-zinc-900">{item.title}</h2>
                  <p className="mt-1 text-sm text-zinc-600">Quantity: {item.qty}</p>
                </div>
                <p className="text-sm font-semibold text-zinc-900">{item.price}</p>
              </article>
            ))}
          </div>

          <aside className="rounded-[28px] border border-stone-200 bg-stone-50/80 p-6 shadow-[0_10px_28px_rgba(68,53,33,0.05)]">
            <div className="h-1.5 w-14 rounded-full bg-orange-200" aria-hidden="true" />
            <h2 className="mt-3 font-display text-[clamp(1.75rem,3vw,2.1rem)] leading-[1.05] tracking-[-0.02em] text-zinc-900">Status</h2>
            <p className="mt-3 text-sm text-zinc-600">Confirmed • Packed • Shipping</p>
            <Link href="/admin/orders" className="mt-6 inline-flex min-h-11 items-center rounded-full border border-stone-200 bg-white px-4 text-sm font-medium text-zinc-800 transition hover:border-stone-300 hover:text-zinc-900">
              Back to orders
            </Link>
          </aside>
        </div>
      </section>
    </RouteShell>
  );
}
