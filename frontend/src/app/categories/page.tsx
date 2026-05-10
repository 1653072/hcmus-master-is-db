import Link from 'next/link';

import { RouteShell } from '@/components/layout/RouteShell';

const categories = ['Psychology', 'Business', 'Communication', 'Self help', 'Creativity', 'Finance'];

export default function Page() {
  return (
    <RouteShell title="Categories" subtitle="Browse curated book collections by theme and discover what fits your reading mood.">
      <section className="mx-auto max-w-page px-6 pb-16 pt-0 lg:px-10 xl:px-24">
        <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {categories.map((item, index) => (
            <Link
              key={item}
              href={`/categories/${item.toLowerCase().replace(/\s+/g, '-')}`}
              className="group rounded-cards-lg border border-stone-surface bg-white p-5 transition duration-200 ease-out hover:-translate-y-0.5"
              style={{ boxShadow: 'var(--shadow-sm)' }}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="h-1.5 w-12 rounded-full bg-ember/20" aria-hidden="true" />
                  <h2 className="mt-4 font-display text-[1.55rem] leading-tight tracking-[-0.02em] text-charcoal">{item}</h2>
                  <p className="mt-2 max-w-xs text-sm leading-7 text-graphite">Browse curated books in this category.</p>
                </div>
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-stone-surface bg-parchment text-graphite transition group-hover:border-ember/20 group-hover:bg-ember/5 group-hover:text-ember">
                  {index + 1}
                </div>
              </div>
              <div className="mt-6 flex items-center justify-between border-t border-stone-surface pt-4 text-sm text-ash">
                <span>Explore collection</span>
                <span className="h-2 w-[5px] rounded-full bg-current" />
              </div>
            </Link>
          ))}
        </div>
      </section>
    </RouteShell>
  );
}
