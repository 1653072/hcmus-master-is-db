import Link from 'next/link';

import { RouteShell } from '@/components/layout/RouteShell';

export default function Page() {
  return (
    <RouteShell title="Search books" subtitle="Find titles by keyword, author, category, or publisher with a calm, fast browsing flow.">
      <section className="mx-auto max-w-page px-6 pb-16 pt-0 lg:px-10 xl:px-24">
        <div className="rounded-cards-lg border border-stone-surface bg-white p-6" style={{ boxShadow: 'var(--shadow-sm)' }}>
          <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-center">
            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.28em] text-ash">Search</span>
              <input
                type="text"
                placeholder="Search books, authors, genres..."
                className="h-12 w-full rounded-full border border-stone-surface bg-parchment px-5 text-sm text-charcoal outline-none transition placeholder:text-smoke focus:border-ember focus:bg-white focus:ring-2 focus:ring-ember/20"
              />
            </label>
            <div className="flex flex-wrap gap-2">
              {['Books', 'Authors', 'Categories', 'Publishers'].map((item, index) => (
                <button
                  key={item}
                  className={`inline-flex min-h-11 items-center rounded-full border px-4 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember/40 ${index === 0 ? 'border-midnight bg-midnight text-white' : 'border-stone-surface bg-white text-graphite hover:border-graphite/30 hover:text-charcoal'}`}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-6 rounded-cards border border-dashed border-stone-surface bg-parchment p-6 text-sm text-graphite">
            Try searching by title, author, or topic to get started.
          </div>
        </div>
      </section>
    </RouteShell>
  );
}
