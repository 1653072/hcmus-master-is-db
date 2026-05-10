import Link from 'next/link';

import { RouteShell } from '@/components/layout/RouteShell';

const books = [
  ['The Psychology of Money', '12.5k views'],
  ['Atomic Habits', '11.9k views'],
  ['Quiet', '10.8k views'],
  ['Deep Work', '9.7k views'],
  ['The Creative Act', '8.4k views'],
  ['How to Talk to Anyone', '7.9k views'],
];

export default function Page() {
  return (
    <RouteShell title="Most viewed today" subtitle="The titles getting the most attention right now across the catalog.">
      <section className="mx-auto max-w-page px-6 pb-16 pt-10 lg:px-10 xl:px-24">
        <div className="rounded-cards-lg border border-stone-surface bg-white p-6" style={{ boxShadow: 'var(--shadow-sm)' }}>
          <div className="mb-6 flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-ash">Trending now</p>
              <p className="mt-2 text-sm text-graphite">Updated throughout the day as readers browse the store.</p>
            </div>
            <Link href="/most-viewed/30days" className="inline-flex min-h-11 items-center rounded-full border border-stone-surface bg-white px-4 text-sm font-medium text-charcoal transition hover:border-graphite/30 hover:text-midnight">
              View 30 days
            </Link>
          </div>

          <div className="space-y-3">
            {books.map(([title, views], index) => (
              <article key={title} className="flex items-center gap-4 rounded-[22px] border border-stone-surface bg-parchment px-4 py-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-ember/5 font-display text-xl tracking-[-0.02em] text-ember">
                  {String(index + 1).padStart(2, '0')}
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="truncate font-display text-[1.15rem] leading-tight tracking-[-0.02em] text-charcoal">{title}</h2>
                  <p className="mt-1 text-sm text-graphite">Most viewed today</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-charcoal">{views}</p>
                  <p className="text-xs text-ash">Live ranking</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    </RouteShell>
  );
}
