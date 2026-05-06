import Link from 'next/link';

import { RouteShell } from '@/components/layout/RouteShell';

const books = [
  { title: 'The Psychology of Money', author: 'Morgan Housel', price: '$24', image: 'linear-gradient(135deg, #f2e7d7 0%, #d8c4ad 100%)' },
  { title: 'Atomic Habits', author: 'James Clear', price: '$24', image: 'linear-gradient(135deg, #efe8dc 0%, #d3c3af 100%)' },
  { title: 'Quiet', author: 'Susan Cain', price: '$26', image: 'linear-gradient(135deg, #ebe6e0 0%, #c7c0b8 100%)' },
  { title: 'Deep Work', author: 'Cal Newport', price: '$25', image: 'linear-gradient(135deg, #e6dfd3 0%, #c6b7a3 100%)' },
];

export default function Page() {
  return (
    <RouteShell title="Psychology" subtitle="Books that help readers understand thoughts, habits, emotions, and human behavior.">
      <section className="mx-auto max-w-[1280px] px-6 pb-16 pt-0 lg:px-10 xl:px-14">
        <Link href="/categories" className="inline-flex items-center gap-2 text-sm font-medium text-zinc-600 transition hover:text-zinc-900">
          <span className="text-base">←</span> Back to categories
        </Link>

        <div className="mt-6 rounded-[28px] border border-stone-200 bg-white/85 p-6 shadow-[0_10px_28px_rgba(68,53,33,0.06)]">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-3">
              <div className="h-1.5 w-14 rounded-full bg-orange-200" aria-hidden="true" />
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-zinc-500">Category</p>
              <h1 className="font-display text-[clamp(2.5rem,5vw,4rem)] leading-[0.95] tracking-[-0.03em] text-zinc-900">Psychology</h1>
            </div>
            <div className="rounded-full border border-stone-200 bg-stone-50 px-4 py-2 text-sm text-zinc-600">24 books</div>
          </div>
        </div>

        <div className="mt-10 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {books.map((book, index) => (
            <article key={book.title} className="rounded-[28px] border border-stone-200 bg-white/85 p-4 shadow-[0_10px_28px_rgba(68,53,33,0.06)] transition duration-200 ease-out-quart hover:-translate-y-0.5 hover:shadow-[0_18px_36px_rgba(68,53,33,0.1)]">
              <div className="h-40 rounded-[18px]" style={{ background: book.image }} />
              <div className="mt-4 flex items-start justify-between gap-4">
                <div>
                  <h2 className="font-display text-[1.1rem] leading-tight text-zinc-900">{book.title}</h2>
                  <p className="mt-1 text-sm text-zinc-600">by {book.author}</p>
                </div>
                <span className="rounded-full bg-orange-50 px-3 py-1 text-sm font-semibold text-orange-700">{book.price}</span>
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-stone-200 pt-3 text-sm text-zinc-500">
                <span>Book #{index + 1}</span>
                <Link href="/books/1" className="font-medium text-zinc-800 transition hover:text-orange-600">
                  View
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>
    </RouteShell>
  );
}
