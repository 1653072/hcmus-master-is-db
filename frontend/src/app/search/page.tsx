import Link from 'next/link';

import { RouteShell } from '@/components/layout/RouteShell';

export default function Page() {
  return (
    <RouteShell title="Search books" subtitle="Find titles by keyword, author, category, or publisher with a calm, fast browsing flow.">
      <section className="mx-auto max-w-[1280px] px-6 pb-16 pt-0 lg:px-10 xl:px-14">
        <div className="rounded-[28px] border border-stone-200 bg-white/85 p-6 shadow-[0_10px_28px_rgba(68,53,33,0.06)]">
          <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-center">
            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.28em] text-zinc-500">Search</span>
              <input
                type="text"
                placeholder="Search books, authors, genres..."
                className="h-12 w-full rounded-full border border-stone-200 bg-stone-50 px-5 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-orange-300 focus:bg-white focus:ring-2 focus:ring-orange-500/20"
              />
            </label>
            <div className="flex flex-wrap gap-2">
              {['Books', 'Authors', 'Categories', 'Publishers'].map((item, index) => (
                <button
                  key={item}
                  className={`inline-flex min-h-11 items-center rounded-full border px-4 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/40 ${index === 0 ? 'border-zinc-900 bg-zinc-900 text-white' : 'border-stone-200 bg-white text-zinc-700 hover:border-stone-300 hover:text-zinc-900'}`}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-6 rounded-[24px] border border-dashed border-stone-300 bg-stone-50/70 p-6 text-sm text-zinc-600">
            Try searching by title, author, or topic to get started.
          </div>
        </div>
      </section>
    </RouteShell>
  );
}
