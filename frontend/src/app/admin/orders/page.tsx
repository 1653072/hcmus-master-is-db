import Link from 'next/link';

import { RouteShell } from '@/components/layout/RouteShell';

const orders = [
  { id: '#1001', customer: 'Lan Anh', status: 'Confirmed', total: '$76' },
  { id: '#1002', customer: 'Hoang Nam', status: 'Packing', total: '$52' },
  { id: '#1003', customer: 'Minh Chau', status: 'Shipping', total: '$44' },
];

export default function Page() {
  return (
    <RouteShell title="Admin orders" subtitle="Track orders, statuses, and fulfillment in one curated overview.">
      <section className="mx-auto max-w-[1280px] px-6 pb-16 pt-0 lg:px-10 xl:px-14">
        <div className="space-y-4">
          {orders.map((order) => (
            <Link key={order.id} href={`/admin/orders/${order.id}`} className="grid gap-4 rounded-[28px] border border-stone-200 bg-white/85 p-5 shadow-[0_10px_28px_rgba(68,53,33,0.06)] transition duration-200 ease-out-quart hover:-translate-y-0.5 hover:shadow-[0_18px_36px_rgba(68,53,33,0.1)] md:grid-cols-[120px_1fr_auto] md:items-center">
              <div className="font-display text-[1.75rem] leading-none tracking-[-0.03em] text-zinc-900">{order.id}</div>
              <div>
                <p className="text-sm font-semibold text-zinc-900">{order.customer}</p>
                <p className="text-sm text-zinc-600">Status: {order.status}</p>
              </div>
              <p className="text-sm font-semibold text-zinc-900">{order.total}</p>
            </Link>
          ))}
        </div>
      </section>
    </RouteShell>
  );
}
