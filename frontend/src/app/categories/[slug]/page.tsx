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
      <section className="mx-auto max-w-page px-6 pb-16 pt-0 lg:px-10 xl:px-24">
        <Link href="/categories" className="inline-flex items-center gap-2 text-sm font-medium text-graphite transition hover:text-charcoal">
          <span className="text-base">←</span> Back to categories
        </Link>

        <div className="mt-6 rounded-cards-lg border border-stone-surface bg-white p-6" style={{ boxShadow: 'var(--shadow-sm)' }}>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-3">
              <div className="h-1.5 w-14 rounded-full bg-ember/20" aria-hidden="true" />
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-ash">Category</p>
              <h1 className="font-display text-[clamp(2.5rem,5vw,4rem)] leading-[0.95] tracking-[-0.03em] text-charcoal">Psychology</h1>
            </div>
            <div className="rounded-full border border-stone-surface bg-parchment px-4 py-2 text-sm text-graphite">24 books</div>
          </div>
        </div>

        <div className="mt-10 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {books.map((book, index) => (
            <article key={book.title} className="rounded-cards-lg border border-stone-surface bg-white p-4 transition duration-200 ease-out hover:-translate-y-0.5" style={{ boxShadow: 'var(--shadow-sm)' }}>
              <div className="h-40 rounded-[18px]" style={{ background: book.image }} />
              <div className="mt-4 flex items-start justify-between gap-4">
                <div>
                  <h2 className="font-display text-[1.1rem] leading-tight text-charcoal">{book.title}</h2>
                  <p className="mt-1 text-sm text-graphite">by {book.author}</p>
                </div>
                <span className="rounded-full bg-ember/5 px-3 py-1 text-sm font-semibold text-ember">{book.price}</span>
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-stone-surface pt-3 text-sm text-ash">
                <span>Book #{index + 1}</span>
                <Link href="/books/1" className="font-medium text-charcoal transition hover:text-ember">
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
