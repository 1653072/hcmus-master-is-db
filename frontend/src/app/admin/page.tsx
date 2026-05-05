import Link from 'next/link';

import { RouteShell } from '@/components/layout/RouteShell';

const sections = [
  { title: 'Books', desc: 'Manage catalog, pricing, and featured titles.' },
  { title: 'Categories', desc: 'Organize collections and browsing paths.' },
  { title: 'Orders', desc: 'Track order status and fulfillment.' },
  { title: 'Users', desc: 'Review customers and access levels.' },
  { title: 'Analytics', desc: 'Measure performance and demand.' },
];

export default function Page() {
  return (
    <RouteShell title="Admin dashboard" subtitle="Manage catalog, users, orders, and analytics from one clear control center.">
      <section className="mx-auto max-w-[1280px] px-6 pb-16 pt-0 lg:px-10 xl:px-14">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {sections.map((section) => (
            <article key={section.title} className="rounded-[28px] border border-stone-200 bg-white/85 p-5 shadow-[0_10px_28px_rgba(68,53,33,0.06)]">
              <div className="h-1.5 w-14 rounded-full bg-orange-200" aria-hidden="true" />
              <h2 className="mt-4 font-display text-[1.35rem] leading-tight tracking-[-0.02em] text-zinc-900">{section.title}</h2>
              <p className="mt-2 text-sm leading-7 text-zinc-600">{section.desc}</p>
            </article>
          ))}
        </div>
      </section>
    </RouteShell>
  );
}
