'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Clock } from 'lucide-react';
import { toast } from 'sonner';

import { ordersApi } from '@/lib/api/orders';
import { StatusBadge } from '@/components/admin/StatusBadge';
import type { Shipment } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';

const STATUS_FLOW = ['pending', 'confirmed', 'packing', 'shipping', 'completed', 'cancelled'] as const;

export default function Page() {
  const params = useParams();
  const orderId = params.id as string;

  const [order, setOrder] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [shipment, setShipment] = useState<Shipment | null>(null);
  const [loading, setLoading] = useState(true);
  const [newStatus, setNewStatus] = useState('');
  const [statusNote, setStatusNote] = useState('');
  const [updating, setUpdating] = useState(false);

  const fetchOrder = useCallback(async () => {
    try {
      setLoading(true);
      const [orderData, historyData, shipmentData] = await Promise.all([
        ordersApi.adminGet(orderId),
        ordersApi.adminHistory(orderId).catch(() => []),
        ordersApi.adminShipmentByOrder(orderId).catch(() => null),
      ]);
      setOrder(orderData);
      setHistory(Array.isArray(historyData) ? historyData : []);
      setShipment(shipmentData);
      setNewStatus(orderData?.status || '');
    } catch {
      toast.error('Failed to load order');
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  const handleUpdateStatus = async () => {
    if (!newStatus || newStatus === order?.status) return;
    setUpdating(true);
    try {
      await ordersApi.adminUpdateStatus(orderId, { status: newStatus as any, note: statusNote });
      toast.success('Status updated');
      setStatusNote('');
      fetchOrder();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to update status');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="px-6 py-8 lg:px-10 xl:px-24">
        <div className="space-y-4">
          <div className="h-8 w-40 animate-pulse rounded-xl bg-stone-surface" />
          <div className="h-64 animate-pulse rounded-2xl bg-stone-surface/60" />
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="px-6 py-8 lg:px-10 xl:px-24">
        <p className="text-sm text-graphite">Order not found.</p>
        <Link href="/admin/orders" className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-ember hover:underline">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to orders
        </Link>
      </div>
    );
  }

  return (
    <div className="px-6 py-8 lg:px-10 xl:px-24">
      <Link href="/admin/orders" className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-graphite transition-colors hover:text-charcoal">
        <ArrowLeft className="h-3.5 w-3.5" /> Back to orders
      </Link>

      <div className="mb-6">
        <div className="h-1.5 w-14 rounded-full bg-ember/20" aria-hidden="true" />
        <h1 className="mt-4 font-display text-[clamp(1.8rem,3vw,2.4rem)] leading-[0.98] tracking-[-0.03em] text-charcoal">
          Order {orderId.substring(0, 8)}…
        </h1>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        {/* Items */}
        <div className="rounded-2xl border border-stone-200 bg-white/85 p-5 shadow-[0_6px_20px_rgba(68,53,33,0.05)]">
          <h2 className="mb-4 text-[11px] font-bold uppercase tracking-[0.14em] text-zinc-400">Order Items</h2>
          <div className="space-y-3">
            {(order.items ?? []).map((item: any, i: number) => (
              <div key={i} className="flex items-center justify-between gap-4 rounded-xl border border-stone-100 bg-stone-50/60 px-4 py-3">
                <div>
                  <p className="font-semibold text-zinc-900">{item.name}</p>
                  <p className="mt-0.5 text-xs text-zinc-500">Qty: {item.quantity} × {formatCurrency(item.unit_price, '0 ₫')}</p>
                </div>
                <p className="text-sm font-semibold text-zinc-700">{formatCurrency(item.quantity * item.unit_price, '0 ₫')}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 flex justify-end border-t border-stone-100 pt-4">
            <p className="text-sm text-zinc-500">
              Total: <span className="ml-1 font-display text-xl font-bold text-zinc-900">{formatCurrency(order.total_amount, '0 ₫')}</span>
            </p>
          </div>
        </div>

        {/* Status Panel + History */}
        <div className="space-y-5">
          {/* Update Status */}
          <div className="rounded-2xl border border-stone-200 bg-stone-50/80 p-5 shadow-[0_6px_20px_rgba(68,53,33,0.05)]">
            <h2 className="mb-3 text-[11px] font-bold uppercase tracking-[0.14em] text-zinc-400">Status</h2>
            <div className="mb-4">
              <StatusBadge status={order.status} variant="order" />
            </div>
            <select
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value)}
              className="w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm capitalize outline-none focus:border-orange-300 focus:ring-2 focus:ring-orange-500/15"
            >
              {STATUS_FLOW.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <textarea
              value={statusNote}
              onChange={(e) => setStatusNote(e.target.value)}
              rows={2}
              className="mt-3 w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm outline-none focus:border-orange-300 focus:ring-2 focus:ring-orange-500/15 resize-none"
              placeholder="Add a note (optional)"
            />
            <button
              type="button"
              onClick={handleUpdateStatus}
              disabled={updating || newStatus === order.status}
              className="mt-3 w-full rounded-full bg-orange-500 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {updating ? 'Updating...' : 'Update Status'}
            </button>
          </div>

          {shipment && (
            <div className="rounded-2xl border border-stone-200 bg-white/85 p-5 shadow-[0_6px_20px_rgba(68,53,33,0.05)]">
              <h2 className="mb-4 text-[11px] font-bold uppercase tracking-[0.14em] text-zinc-400">Shipment</h2>
              <div className="space-y-2 text-sm text-zinc-700">
                <div className="flex justify-between gap-4"><span>Status</span><span className="font-semibold capitalize text-zinc-900">{shipment.status}</span></div>
                {shipment.carrier ? <div className="flex justify-between gap-4"><span>Carrier</span><span>{shipment.carrier}</span></div> : null}
                {shipment.tracking_number ? <div className="flex justify-between gap-4"><span>Tracking</span><span>{shipment.tracking_number}</span></div> : null}
                {shipment.shipped_at ? <div className="flex justify-between gap-4"><span>Shipped</span><span>{new Date(shipment.shipped_at).toLocaleString()}</span></div> : null}
                {shipment.delivered_at ? <div className="flex justify-between gap-4"><span>Delivered</span><span>{new Date(shipment.delivered_at).toLocaleString()}</span></div> : null}
              </div>
            </div>
          )}

          {/* History */}
          {history.length > 0 && (
            <div className="rounded-2xl border border-stone-200 bg-white/85 p-5 shadow-[0_6px_20px_rgba(68,53,33,0.05)]">
              <h2 className="mb-4 text-[11px] font-bold uppercase tracking-[0.14em] text-zinc-400">Status History</h2>
              <div className="space-y-3">
                {history.map((h: any, i: number) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-orange-50">
                      <Clock className="h-3 w-3 text-orange-500" />
                    </div>
                    <div>
                      <p className="text-sm text-zinc-700">
                        <span className="font-medium">{h.old_status || '—'}</span>
                        {' → '}
                        <span className="font-semibold">{h.new_status}</span>
                      </p>
                      {h.note && <p className="mt-0.5 text-xs text-zinc-400">{h.note}</p>}
                      <p className="mt-0.5 text-[11px] text-zinc-400">
                        {h.changed_at ? new Date(h.changed_at).toLocaleString() : ''}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
