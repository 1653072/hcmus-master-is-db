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
      <section className="mx-auto max-w-[1280px] px-6 pb-16 pt-0 lg:px-10 xl:px-14">
        <div className="space-y-4">
          {orders.map((order) => (
            <article key={order.id} className="flex flex-col gap-4 rounded-[28px] border border-stone-200 bg-white/85 p-5 shadow-[0_10px_28px_rgba(68,53,33,0.06)] md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-zinc-500">Order {order.id}</p>
                <h2 className="mt-2 font-display text-[1.3rem] leading-tight tracking-[-0.02em] text-zinc-900">{order.status}</h2>
                <p className="mt-1 text-sm text-zinc-600">Placed {order.date}</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-sm font-semibold text-zinc-900">{order.total}</p>
                  <p className="text-xs text-zinc-500">Total</p>
                </div>
                <Link href="/orders/1" className="inline-flex min-h-11 items-center rounded-full border border-stone-200 bg-white px-4 text-sm font-medium text-zinc-800 transition hover:border-stone-300 hover:text-zinc-900">
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
