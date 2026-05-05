import Link from 'next/link';

import { RouteShell } from '@/components/layout/RouteShell';

const categories = [
  { title: 'Psychology', books: 24, visibility: 'High' },
  { title: 'Business', books: 18, visibility: 'Medium' },
  { title: 'Creativity', books: 12, visibility: 'High' },
];

export default function Page() {
  return (
    <RouteShell title="Manage categories" subtitle="Organize the storefront taxonomy and browsing paths.">
      <section className="mx-auto max-w-[1280px] px-6 pb-16 pt-0 lg:px-10 xl:px-14">
        <div className="space-y-4">
          {categories.map((category) => (
            <article key={category.title} className="flex flex-col gap-4 rounded-[28px] border border-stone-200 bg-white/85 p-5 shadow-[0_10px_28px_rgba(68,53,33,0.06)] md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-zinc-500">Collection</p>
                <h2 className="mt-2 font-display text-[1.35rem] leading-tight tracking-[-0.02em] text-zinc-900">{category.title}</h2>
                <p className="mt-1 text-sm text-zinc-600">{category.books} books visible</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-sm font-semibold text-zinc-900">{category.visibility}</p>
                  <p className="text-xs text-zinc-500">Visibility</p>
                </div>
                <Link href="/admin/categories" className="inline-flex min-h-11 items-center rounded-full border border-stone-200 bg-white px-4 text-sm font-medium text-zinc-800 transition hover:border-stone-300 hover:text-zinc-900">Edit</Link>
              </div>
            </article>
          ))}
        </div>
      </section>
    </RouteShell>
  );
}
