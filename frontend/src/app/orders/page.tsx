'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { RouteShell } from '@/components/layout/RouteShell';
import { CommerceSection, CommerceState } from '@/components/ui/commerce';
import { ordersApi } from '@/lib/api/orders';
import type { Order } from '@/lib/types';

function formatPrice(value?: number) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(value ?? 0);
}

function formatDate(value?: string) {
  if (!value) return 'Chưa rõ ngày';
  return new Date(value).toLocaleDateString('vi-VN');
}

export default function Page() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadOrders() {
      try {
        setLoading(true);
        setError(null);
        const res = await ordersApi.history();
        if (!mounted) return;
        setOrders(Array.isArray(res?.data) ? res.data : []);
      } catch (err: any) {
        if (!mounted) return;
        setError(err?.response?.data?.error || 'Không tải được đơn hàng');
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadOrders();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <RouteShell title="Đơn hàng" subtitle="Theo dõi các đơn sách gần đây và trạng thái xử lý.">
      <CommerceSection className="pb-16 pt-10">
        {loading ? (
          <div className="rounded-cards-lg border border-stone-surface bg-white p-6 text-sm text-graphite" style={{ boxShadow: 'var(--shadow-sm)' }}>
            Đang tải đơn hàng...
          </div>
        ) : error ? (
          <CommerceState title="Không tải được đơn hàng" message={error} tone="error" />
        ) : orders.length === 0 ? (
          <CommerceState title="Bạn chưa có đơn hàng" message="Khi đặt sách thành công, đơn hàng sẽ xuất hiện tại đây." actionHref="/books" actionLabel="Mua sách" />
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <article key={order.alias_id} className="flex flex-col gap-4 rounded-cards-lg border border-stone-surface bg-white p-5 md:flex-row md:items-center md:justify-between" style={{ boxShadow: 'var(--shadow-sm)' }}>
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.24em] text-ash">Đơn {order.alias_id.slice(0, 8)}</p>
                  <h2 className="mt-2 font-display text-[1.3rem] capitalize leading-tight text-charcoal">{order.status}</h2>
                  <p className="mt-1 text-sm text-graphite">Đặt ngày {formatDate(order.created_at)}</p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-sm font-medium text-charcoal">{formatPrice(order.total_amount)}</p>
                    <p className="text-xs text-ash">Tổng</p>
                  </div>
                  <Link href={`/orders/${order.alias_id}`} className="inline-flex min-h-11 items-center rounded-full border border-stone-surface bg-white px-4 text-sm font-medium text-charcoal transition hover:border-graphite/30 hover:text-midnight">
                    Xem
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </CommerceSection>
    </RouteShell>
  );
}
