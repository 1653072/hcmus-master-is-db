import Link from 'next/link';

import { RouteShell } from '@/components/layout/RouteShell';

const books = [
  { title: 'The Psychology of Money', author: 'Morgan Housel', price: '$24', rank: '01', image: 'linear-gradient(135deg, #0d0d0d 0%, #1f1c17 100%)' },
  { title: 'Atomic Habits', author: 'James Clear', price: '$24', rank: '02', image: 'linear-gradient(135deg, #ebe7de 0%, #c7beb2 100%)' },
  { title: 'Quiet', author: 'Susan Cain', price: '$26', rank: '03', image: 'linear-gradient(135deg, #3a4048 0%, #12161c 100%)' },
  { title: 'Deep Work', author: 'Cal Newport', price: '$25', rank: '04', image: 'linear-gradient(135deg, #2b2f36 0%, #14171d 100%)' },
  { title: 'The Creative Act', author: 'Rick Rubin', price: '$28', rank: '05', image: 'linear-gradient(135deg, #32281f 0%, #7a5a43 100%)' },
  { title: 'How to Talk to Anyone', author: 'Leil Lowndes', price: '$32', rank: '06', image: 'linear-gradient(135deg, #191814 0%, #2a2720 100%)' },
];

export default function Page() {
  return (
    <RouteShell title="Best sellers" subtitle="A curated ranking of the titles readers keep returning to.">
      <section className="mx-auto max-w-[1280px] px-6 pb-16 pt-0 lg:px-10 xl:px-14">
        <div className="space-y-4">
          {books.map((book) => (
            <article key={book.title} className="grid gap-4 rounded-[28px] border border-stone-200 bg-white/85 p-4 shadow-[0_10px_28px_rgba(68,53,33,0.06)] transition duration-200 ease-out-quart hover:-translate-y-0.5 hover:shadow-[0_18px_36px_rgba(68,53,33,0.1)] md:grid-cols-[84px_1fr_auto] md:items-center">
              <div className="flex h-20 items-center justify-center rounded-[20px] bg-stone-50 px-3 font-display text-[2rem] leading-none tracking-[-0.03em] text-orange-500">
                {book.rank}
              </div>
              <div className="flex items-center gap-4">
                <div className="h-24 w-16 rounded-[16px]" style={{ background: book.image }} />
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-500">Ranked pick</p>
                  <h2 className="mt-1 font-display text-[1.2rem] leading-tight tracking-[-0.02em] text-zinc-900">{book.title}</h2>
                  <p className="mt-1 text-sm text-zinc-600">by {book.author}</p>
                </div>
              </div>
              <div className="flex items-center justify-between gap-4 md:flex-col md:items-end">
                <span className="text-sm font-semibold text-zinc-900">{book.price}</span>
                <Link href="/books/1" className="inline-flex min-h-11 items-center rounded-full border border-stone-200 bg-white px-4 text-sm font-medium text-zinc-800 transition hover:border-stone-300 hover:text-zinc-900">View detail</Link>
              </div>
            </article>
          ))}
        </div>
      </section>
    </RouteShell>
  );
}
