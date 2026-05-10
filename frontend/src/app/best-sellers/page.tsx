'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { RouteShell } from '@/components/layout/RouteShell';
import { recommendationsApi } from '@/lib/api/recommendations';

export default function Page() {
  const [books, setBooks] = useState<any[]>([]);

  useEffect(() => {
    recommendationsApi.getBestSellers().then((data) => {
      setBooks(data || []);
    }).catch(console.error);
  }, []);

  return (
    <RouteShell title="Best sellers" subtitle="A curated ranking of the titles readers keep returning to.">
      <section className="mx-auto max-w-page px-6 pb-16 pt-10 lg:px-10 xl:px-24">
        <div className="space-y-4">
          {books.length > 0 ? books.map((book, index) => (
            <article key={book.book_id} className="grid gap-4 rounded-cards-lg border border-stone-surface bg-white p-4 transition duration-200 ease-out hover:-translate-y-0.5" style={{ boxShadow: 'var(--shadow-sm)' }}>
              <div className="flex h-20 items-center justify-center rounded-[20px] bg-parchment px-3 font-display text-[2rem] leading-none tracking-[-0.03em] text-ember">
                {String(index + 1).padStart(2, '0')}
              </div>
              <div className="flex items-center gap-4">
                <div className="h-24 w-16 rounded-[16px] bg-stone-surface" />
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-ash">Ranked pick</p>
                  <h2 className="mt-1 font-display text-[1.2rem] leading-tight tracking-[-0.02em] text-charcoal">{book.title}</h2>
                  <p className="mt-1 text-sm text-graphite">Sold: {book.total_sold}</p>
                </div>
              </div>
              <div className="flex items-center justify-between gap-4 md:flex-col md:items-end">
                <Link href={`/books/${book.book_id}`} className="inline-flex min-h-11 items-center rounded-full border border-stone-surface bg-white px-4 text-sm font-medium text-charcoal transition hover:border-graphite/30 hover:text-midnight">View detail</Link>
              </div>
            </article>
          )) : (
            <div className="p-8 text-center text-graphite">Loading...</div>
          )}
        </div>
      </section>
    </RouteShell>
  );
}
