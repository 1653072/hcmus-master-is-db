import Link from 'next/link';

import { RouteShell } from '@/components/layout/RouteShell';

const books = [
  { title: 'The Psychology of Money', status: 'Published', stock: '24', price: '$24' },
  { title: 'Atomic Habits', status: 'Draft', stock: '12', price: '$24' },
  { title: 'Quiet', status: 'Published', stock: '18', price: '$26' },
];

export default function Page() {
  return (
    <RouteShell title="Manage books" subtitle="Review catalog status, stock, and pricing from one calm admin view.">
      <section className="mx-auto max-w-[1280px] px-6 pb-16 pt-0 lg:px-10 xl:px-14">
        <div className="space-y-4">
          {books.map((book) => (
            <article key={book.title} className="flex flex-col gap-4 rounded-[28px] border border-stone-200 bg-white/85 p-5 shadow-[0_10px_28px_rgba(68,53,33,0.06)] md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-zinc-500">Catalog item</p>
                <h2 className="mt-2 font-display text-[1.35rem] leading-tight tracking-[-0.02em] text-zinc-900">{book.title}</h2>
                <p className="mt-1 text-sm text-zinc-600">Status: {book.status}</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-sm font-semibold text-zinc-900">{book.stock} in stock</p>
                  <p className="text-xs text-zinc-500">Inventory</p>
                </div>
                <Link href="/admin/books" className="inline-flex min-h-11 items-center rounded-full border border-stone-200 bg-white px-4 text-sm font-medium text-zinc-800 transition hover:border-stone-300 hover:text-zinc-900">Edit</Link>
              </div>
            </article>
          ))}
        </div>
      </section>
    </RouteShell>
  );
}
