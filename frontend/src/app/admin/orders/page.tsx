'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';

import { ordersApi } from '@/lib/api/orders';
import { StatusBadge } from '@/components/admin/StatusBadge';
import { Pagination } from '@/components/admin/Pagination';

const PAGE_SIZE = 10;
const STATUSES = ['all', 'pending', 'confirmed', 'packing', 'shipping', 'completed', 'cancelled'] as const;

export default function Page() {
  const [orders, setOrders] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      const params: any = { page, page_size: PAGE_SIZE };
      if (statusFilter !== 'all') params.status = statusFilter;
      const res = await ordersApi.adminList(params);
      setOrders(res?.data ?? []);
      setTotal(res?.total ?? 0);
    } catch {
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  return (
    <div className="px-6 py-8 lg:px-10">
      <div className="mb-6">
        <div className="h-1.5 w-14 rounded-full bg-orange-200" aria-hidden="true" />
        <h1 className="mt-4 font-display text-[clamp(2rem,4vw,2.8rem)] leading-[0.98] tracking-[-0.03em] text-zinc-900">
          Manage Orders
        </h1>
        <p className="mt-3 text-sm text-zinc-500">{total} order{total !== 1 ? 's' : ''} total</p>
      </div>

      {/* Status filter pills */}
      <div className="mb-6 flex flex-wrap gap-1.5">
        {STATUSES.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => { setPage(1); setStatusFilter(s); }}
            className={`rounded-full px-3.5 py-1.5 text-[12px] font-semibold capitalize transition-colors ${
              statusFilter === s
                ? 'bg-zinc-900 text-white'
                : 'border border-stone-200 bg-white text-zinc-500 hover:bg-stone-50 hover:text-zinc-700'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-2xl bg-stone-200/60" />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <div className="rounded-2xl border border-stone-200 bg-white/80 p-12 text-center">
          <p className="text-sm text-zinc-500">No orders found.</p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-2xl border border-stone-200 bg-white/85 shadow-[0_6px_20px_rgba(68,53,33,0.05)]">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-stone-100">
                  <th className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-[0.14em] text-zinc-400">Order</th>
                  <th className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-[0.14em] text-zinc-400">Status</th>
                  <th className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-[0.14em] text-zinc-400">Items</th>
                  <th className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-[0.14em] text-zinc-400">Total</th>
                  <th className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-[0.14em] text-zinc-400">Date</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order: any) => (
                  <tr key={order.alias_id} className="border-b border-stone-50 transition-colors hover:bg-stone-50/60">
                    <td className="px-5 py-3.5">
                      <Link
                        href={`/admin/orders/${order.alias_id}`}
                        className="font-semibold text-orange-600 hover:text-orange-700 hover:underline"
                      >
                        {order.alias_id?.substring(0, 8)}…
                      </Link>
                    </td>
                    <td className="px-5 py-3.5">
                      <StatusBadge status={order.status} variant="order" />
                    </td>
                    <td className="px-5 py-3.5 text-zinc-600">
                      {order.items?.length ?? 0} item{(order.items?.length ?? 0) !== 1 ? 's' : ''}
                    </td>
                    <td className="px-5 py-3.5 font-medium text-zinc-700">
                      ${order.total_amount?.toFixed(2) ?? '0.00'}
                    </td>
                    <td className="px-5 py-3.5 text-zinc-500">
                      {order.created_at ? new Date(order.created_at).toLocaleDateString() : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}
