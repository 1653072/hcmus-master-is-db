import Link from 'next/link';

import { RouteShell } from '@/components/layout/RouteShell';

const categories = ['Psychology', 'Business', 'Communication', 'Self help', 'Creativity', 'Finance'];

export default function Page() {
  return (
    <RouteShell title="Categories" subtitle="Browse curated book collections by theme and discover what fits your reading mood.">
      <section className="mx-auto max-w-[1280px] px-6 pb-16 pt-0 lg:px-10 xl:px-14">
        <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {categories.map((item, index) => (
            <Link
              key={item}
              href={`/categories/${item.toLowerCase().replace(/\s+/g, '-')}`}
              className="group rounded-[28px] border border-stone-200 bg-white/85 p-5 shadow-[0_10px_28px_rgba(68,53,33,0.06)] transition duration-200 ease-out-quart hover:-translate-y-0.5 hover:shadow-[0_18px_36px_rgba(68,53,33,0.1)]"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="h-1.5 w-12 rounded-full bg-orange-200" aria-hidden="true" />
                  <h2 className="mt-4 font-display text-[1.55rem] leading-tight tracking-[-0.02em] text-zinc-900">{item}</h2>
                  <p className="mt-2 max-w-xs text-sm leading-7 text-zinc-600">Browse curated books in this category.</p>
                </div>
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-stone-200 bg-stone-50 text-zinc-700 transition group-hover:border-orange-200 group-hover:bg-orange-50 group-hover:text-orange-600">
                  {index + 1}
                </div>
              </div>
              <div className="mt-6 flex items-center justify-between border-t border-stone-200 pt-4 text-sm text-zinc-500">
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
