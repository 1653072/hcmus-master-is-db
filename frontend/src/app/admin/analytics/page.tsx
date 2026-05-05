'use client';

import { useEffect, useState } from 'react';
import { DollarSign, Package, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';

import { adminApi } from '@/lib/api/admin';

export default function Page() {
  const [sales, setSales] = useState<any>(null);
  const [bestSellers, setBestSellers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const [salesData, bsData] = await Promise.all([
          adminApi.sales().catch(() => null),
          adminApi.bestSellers().catch(() => []),
        ]);
        setSales(salesData);
        setBestSellers(Array.isArray(bsData) ? bsData : []);
      } catch {
        toast.error('Failed to load analytics');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="px-6 py-8 lg:px-10">
        <div className="space-y-4">
          <div className="h-8 w-40 animate-pulse rounded-xl bg-stone-200" />
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-28 animate-pulse rounded-2xl bg-stone-200/60" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const metrics = [
    {
      label: 'Total Revenue',
      value: sales?.total_revenue != null ? `$${sales.total_revenue.toLocaleString()}` : '$0',
      icon: DollarSign,
      color: 'bg-emerald-50 text-emerald-500',
    },
    {
      label: 'Total Orders',
      value: sales?.total_orders?.toLocaleString() ?? '0',
      icon: Package,
      color: 'bg-blue-50 text-blue-500',
    },
    {
      label: 'Best Sellers',
      value: String(bestSellers.length),
      icon: TrendingUp,
      color: 'bg-orange-50 text-orange-500',
    },
  ];

  return (
    <div className="px-6 py-8 lg:px-10">
      <div className="mb-8">
        <div className="h-1.5 w-14 rounded-full bg-orange-200" aria-hidden="true" />
        <h1 className="mt-4 font-display text-[clamp(2rem,4vw,2.8rem)] leading-[0.98] tracking-[-0.03em] text-zinc-900">
          Analytics
        </h1>
        <p className="mt-3 text-sm text-zinc-500">
          Monitor storefront performance and demand.
        </p>
      </div>

      {/* Metric Cards */}
      <div className="mb-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {metrics.map((m) => {
          const Icon = m.icon;
          return (
            <div
              key={m.label}
              className="rounded-2xl border border-stone-200 bg-white/85 p-5 shadow-[0_6px_20px_rgba(68,53,33,0.05)]"
            >
              <div className="flex items-center gap-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${m.color}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-zinc-400">{m.label}</p>
              </div>
              <p className="mt-4 font-display text-[2rem] leading-none tracking-[-0.03em] text-zinc-900">{m.value}</p>
            </div>
          );
        })}
      </div>

      {/* Best Sellers Table */}
      {bestSellers.length > 0 && (
        <div>
          <h2 className="mb-4 text-[11px] font-bold uppercase tracking-[0.14em] text-zinc-400">
            Top Best Sellers (30 days)
          </h2>
          <div className="overflow-x-auto rounded-2xl border border-stone-200 bg-white/85 shadow-[0_6px_20px_rgba(68,53,33,0.05)]">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-stone-100">
                  <th className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-[0.14em] text-zinc-400">#</th>
                  <th className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-[0.14em] text-zinc-400">Title</th>
                  <th className="px-5 py-3.5 text-right text-[11px] font-bold uppercase tracking-[0.14em] text-zinc-400">Sold</th>
                </tr>
              </thead>
              <tbody>
                {bestSellers.map((bs: any, i: number) => (
                  <tr key={bs.book_id || i} className="border-b border-stone-50 transition-colors hover:bg-stone-50/60">
                    <td className="px-5 py-3.5 font-display text-lg font-bold text-zinc-300">{i + 1}</td>
                    <td className="px-5 py-3.5 font-semibold text-zinc-900">{bs.title || bs.book_id}</td>
                    <td className="px-5 py-3.5 text-right font-medium text-zinc-700">{bs.total_sold}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {bestSellers.length === 0 && (
        <div className="rounded-2xl border border-stone-200 bg-white/80 p-12 text-center">
          <p className="text-sm text-zinc-500">No sales data yet. Best sellers will appear once orders are placed.</p>
        </div>
      )}
    </div>
  );
}
