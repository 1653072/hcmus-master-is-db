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
      <section className="mx-auto max-w-[1280px] px-6 pb-16 pt-0 lg:px-10 xl:px-14">
        <div className="rounded-[28px] border border-stone-200 bg-white/85 p-6 shadow-[0_10px_28px_rgba(68,53,33,0.06)]">
          <div className="mb-6 flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-zinc-500">Trending now</p>
              <p className="mt-2 text-sm text-zinc-600">Updated throughout the day as readers browse the store.</p>
            </div>
            <Link href="/most-viewed/30days" className="inline-flex min-h-11 items-center rounded-full border border-stone-200 bg-white px-4 text-sm font-medium text-zinc-800 transition hover:border-stone-300 hover:text-zinc-900">
              View 30 days
            </Link>
          </div>

          <div className="space-y-3">
            {books.map(([title, views], index) => (
              <article key={title} className="flex items-center gap-4 rounded-[22px] border border-stone-200 bg-stone-50/70 px-4 py-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-50 font-display text-xl tracking-[-0.02em] text-orange-500">
                  {String(index + 1).padStart(2, '0')}
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="truncate font-display text-[1.15rem] leading-tight tracking-[-0.02em] text-zinc-900">{title}</h2>
                  <p className="mt-1 text-sm text-zinc-600">Most viewed today</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-zinc-900">{views}</p>
                  <p className="text-xs text-zinc-500">Live ranking</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    </RouteShell>
  );
}
