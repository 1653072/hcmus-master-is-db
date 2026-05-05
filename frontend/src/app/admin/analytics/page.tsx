import Link from 'next/link';

import { RouteShell } from '@/components/layout/RouteShell';

const metrics = [
  { label: 'Revenue', value: '$12.4k' },
  { label: 'Orders', value: '428' },
  { label: 'Conversion', value: '3.8%' },
  { label: 'Return rate', value: '1.2%' },
];

export default function Page() {
  return (
    <RouteShell title="Analytics" subtitle="Monitor storefront performance with a simple, readable dashboard.">
      <section className="mx-auto max-w-[1280px] px-6 pb-16 pt-0 lg:px-10 xl:px-14">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {metrics.map((metric) => (
            <article key={metric.label} className="rounded-[28px] border border-stone-200 bg-white/85 p-5 shadow-[0_10px_28px_rgba(68,53,33,0.06)]">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-zinc-500">{metric.label}</p>
              <p className="mt-3 font-display text-[2rem] leading-none tracking-[-0.03em] text-zinc-900">{metric.value}</p>
            </article>
          ))}
        </div>
      </section>
    </RouteShell>
  );
}
