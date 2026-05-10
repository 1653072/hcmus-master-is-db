import Link from 'next/link';

import { RouteShell } from '@/components/layout/RouteShell';

const orders = [
  { id: '#1042', status: 'Pending', total: '$76', date: 'Today' },
  { id: '#1038', status: 'Completed', total: '$48', date: 'Last week' },
  { id: '#1029', status: 'Shipping', total: '$32', date: 'Last month' },
];

export default function Page() {
  return (
    <RouteShell title="Orders" subtitle="Track your recent purchases and follow their status.">
      <section className="mx-auto max-w-page px-6 pb-16 pt-10 lg:px-10 xl:px-24">
        <div className="space-y-4">
          {orders.map((order) => (
            <article key={order.id} className="flex flex-col gap-4 rounded-cards-lg border border-stone-surface bg-white p-5 md:flex-row md:items-center md:justify-between" style={{ boxShadow: 'var(--shadow-sm)' }}>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-ash">Order {order.id}</p>
                <h2 className="mt-2 font-display text-[1.3rem] leading-tight tracking-[-0.02em] text-charcoal">{order.status}</h2>
                <p className="mt-1 text-sm text-graphite">Placed {order.date}</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-sm font-semibold text-charcoal">{order.total}</p>
                  <p className="text-xs text-ash">Total</p>
                </div>
                <Link href="/orders/1" className="inline-flex min-h-11 items-center rounded-full border border-stone-surface bg-white px-4 text-sm font-medium text-charcoal transition hover:border-graphite/30 hover:text-midnight">
                  View
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>
    </RouteShell>
  );
}
