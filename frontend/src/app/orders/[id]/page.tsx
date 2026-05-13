'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ArrowLeft } from 'lucide-react';

import { RouteShell } from '@/components/layout/RouteShell';
import { ordersApi } from '@/lib/api/orders';
import type { Order, Shipment } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';

function formatDate(value?: string) {
  if (!value) return 'Chưa rõ ngày';
  return new Date(value).toLocaleString('vi-VN');
}

export default function Page() {
  const params = useParams<{ id: string }>();
  const orderID = params?.id;
  const [order, setOrder] = useState<Order | null>(null);
  const [shipment, setShipment] = useState<Shipment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!orderID) return;
    let mounted = true;

    async function loadOrder() {
      try {
        setLoading(true);
        setError(null);
        const [data, shipmentData] = await Promise.all([
          ordersApi.detail(orderID),
          ordersApi.shipment(orderID).catch(() => null),
        ]);
        if (!mounted) return;
        setOrder(data);
        setShipment(shipmentData);
      } catch (err: any) {
        if (!mounted) return;
        setError(err?.response?.data?.error || 'Không tải được chi tiết đơn hàng');
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadOrder();
    return () => {
      mounted = false;
    };
  }, [orderID]);

  return (
    <RouteShell title="Chi tiết đơn hàng">
      <section className="mx-auto max-w-page px-6 pb-16 pt-10 lg:px-10 xl:px-24">
        <Link href="/orders" className="inline-flex items-center gap-2 text-sm font-medium text-graphite transition hover:text-charcoal">
          <ArrowLeft className="h-4 w-4" />
          Quay lại đơn hàng
        </Link>

        {loading ? (
          <div className="mt-6 rounded-cards-lg border border-stone-surface bg-white p-6 text-sm text-graphite" style={{ boxShadow: 'var(--shadow-sm)' }}>
            Đang tải chi tiết đơn hàng...
          </div>
        ) : error ? (
          <div className="mt-6 rounded-cards-lg border border-coral-red/20 bg-coral-red/5 p-6 text-coral-red" style={{ boxShadow: 'var(--shadow-sm)' }}>
            <p className="font-medium">Không tải được đơn hàng</p>
            <p className="mt-2 text-sm text-graphite">{error}</p>
          </div>
        ) : order ? (
          <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_0.38fr]">
            <div className="rounded-cards-lg border border-stone-surface bg-white p-5" style={{ boxShadow: 'var(--shadow-sm)' }}>
              <p className="text-xs font-medium uppercase tracking-[0.24em] text-ash">Sách trong đơn</p>
              <div className="mt-4 space-y-3">
                {(order.items ?? []).map((item) => (
                  <div key={`${item.book_id}-${item.name}`} className="flex justify-between gap-4 rounded-cards border border-stone-surface bg-parchment px-4 py-3 text-sm">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-charcoal">{item.name}</p>
                      <p className="mt-1 text-xs text-ash">Số lượng {item.quantity} x {formatCurrency(item.unit_price, '0 ₫')}</p>
                    </div>
                    <p className="shrink-0 font-medium text-charcoal">{formatCurrency(item.quantity * item.unit_price, '0 ₫')}</p>
                  </div>
                ))}
              </div>
            </div>

            <aside className="h-fit rounded-cards-lg border border-stone-surface bg-parchment p-5" style={{ boxShadow: 'var(--shadow-sm)' }}>
              <div className="h-1.5 w-14 rounded-full bg-ember/20" aria-hidden="true" />
              <h2 className="mt-3 font-display text-[clamp(1.6rem,3vw,2rem)] leading-tight text-charcoal">Tóm tắt</h2>
              <div className="mt-4 space-y-3 text-sm text-graphite">
                <div className="flex justify-between gap-4">
                  <span>Trạng thái</span>
                  <span className="font-medium capitalize text-charcoal">{order.status}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span>Ngày đặt</span>
                  <span className="text-right text-charcoal">{formatDate(order.created_at)}</span>
                </div>
                {order.note ? (
                  <div className="border-t border-stone-surface pt-3">
                    <p className="text-xs uppercase tracking-[0.2em] text-ash">Ghi chú</p>
                    <p className="mt-1 text-charcoal">{order.note}</p>
                  </div>
                ) : null}
                {shipment ? (
                  <div className="border-t border-stone-surface pt-3">
                    <p className="text-xs uppercase tracking-[0.2em] text-ash">Vận chuyển</p>
                    <div className="mt-2 space-y-2 text-charcoal">
                      <div className="flex justify-between gap-4"><span>Trạng thái</span><span className="font-medium capitalize">{shipment.status}</span></div>
                      {shipment.carrier ? <div className="flex justify-between gap-4"><span>Đơn vị</span><span>{shipment.carrier}</span></div> : null}
                      {shipment.tracking_number ? <div className="flex justify-between gap-4"><span>Mã vận đơn</span><span>{shipment.tracking_number}</span></div> : null}
                    </div>
                  </div>
                ) : null}
                <div className="flex justify-between border-t border-stone-surface pt-3 font-medium text-charcoal">
                  <span>Tổng</span>
                  <span>{formatCurrency(order.total_amount, '0 ₫')}</span>
                </div>
              </div>
            </aside>
          </div>
        ) : null}
      </section>
    </RouteShell>
  );
}
