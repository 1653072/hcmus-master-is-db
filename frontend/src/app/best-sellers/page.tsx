import Link from 'next/link';

import { RouteShell } from '@/components/layout/RouteShell';

const books = [
  { title: 'The Psychology of Money', author: 'Morgan Housel', price: '$24', rank: '01', image: 'linear-gradient(135deg, var(--color-midnight) 0%, #1f1c17 100%)' },
  { title: 'Atomic Habits', author: 'James Clear', price: '$24', rank: '02', image: 'linear-gradient(135deg, #ebe7de 0%, var(--color-stone-surface) 100%)' },
  { title: 'Quiet', author: 'Susan Cain', price: '$26', rank: '03', image: 'linear-gradient(135deg, #3a4048 0%, var(--color-midnight) 100%)' },
  { title: 'Deep Work', author: 'Cal Newport', price: '$25', rank: '04', image: 'linear-gradient(135deg, #2b2f36 0%, #14171d 100%)' },
  { title: 'The Creative Act', author: 'Rick Rubin', price: '$28', rank: '05', image: 'linear-gradient(135deg, #32281f 0%, #7a5a43 100%)' },
  { title: 'How to Talk to Anyone', author: 'Leil Lowndes', price: '$32', rank: '06', image: 'linear-gradient(135deg, #191814 0%, #2a2720 100%)' },
];

export default function Page() {
  return (
    <RouteShell title="Best sellers" subtitle="A curated ranking of the titles readers keep returning to.">
      <section className="mx-auto max-w-page px-6 pb-16 pt-10 lg:px-10 xl:px-24">
        <div className="space-y-4">
          {books.map((book) => (
            <article key={book.title} className="grid gap-4 rounded-cards-lg border border-stone-surface bg-white p-4 transition duration-200 ease-out hover:-translate-y-0.5" style={{ boxShadow: 'var(--shadow-sm)' }}>
              <div className="flex h-20 items-center justify-center rounded-[20px] bg-parchment px-3 font-display text-[2rem] leading-none tracking-[-0.03em] text-ember">
                {book.rank}
              </div>
              <div className="flex items-center gap-4">
                <div className="h-24 w-16 rounded-[16px]" style={{ background: book.image }} />
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-ash">Ranked pick</p>
                  <h2 className="mt-1 font-display text-[1.2rem] leading-tight tracking-[-0.02em] text-charcoal">{book.title}</h2>
                  <p className="mt-1 text-sm text-graphite">by {book.author}</p>
                </div>
              </div>
              <div className="flex items-center justify-between gap-4 md:flex-col md:items-end">
                <span className="text-sm font-semibold text-charcoal">{book.price}</span>
                <Link href="/books/1" className="inline-flex min-h-11 items-center rounded-full border border-stone-surface bg-white px-4 text-sm font-medium text-charcoal transition hover:border-graphite/30 hover:text-midnight">View detail</Link>
              </div>
            </article>
          ))}
        </div>
      </section>
    </RouteShell>
  );
}
