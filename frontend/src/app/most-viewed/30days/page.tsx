'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { RouteShell } from '@/components/layout/RouteShell';
import { recommendationsApi } from '@/lib/api/recommendations';

export default function Page() {
  const [books, setBooks] = useState<any[]>([]);

  useEffect(() => {
    recommendationsApi.getTopMostViewed30Days().then((data) => {
      setBooks(data || []);
    }).catch(console.error);
  }, []);

  return (
    <RouteShell title="Most viewed in 30 days" subtitle="Monthly reading trends based on accumulated views and discovery patterns.">
      <section className="mx-auto max-w-page px-6 pb-16 pt-10 lg:px-10 xl:px-24">
        <div className="rounded-cards-lg bg-white p-6" style={{ boxShadow: 'var(--shadow-subtle)' }}>
          <div className="space-y-3">
            {books.length > 0 ? books.map((book, index) => (
              <Link href={`/books/${book.book_id}`} key={book.book_id}>
                <article className="flex items-center gap-4 rounded-[22px] border border-stone-surface bg-parchment px-4 py-4 transition hover:-translate-y-0.5">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-ember/5 font-display text-xl tracking-[-0.02em] text-ember">
                    {String(index + 1).padStart(2, '0')}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="truncate font-display text-[1.15rem] leading-tight tracking-[-0.02em] text-charcoal group-hover:text-ember transition">{book.title}</h2>
                    <p className="mt-1 text-sm text-graphite">Most viewed this month</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-charcoal">{book.view_count} views</p>
                    <p className="text-xs text-ash">30-day ranking</p>
                  </div>
                </article>
              </Link>
            )) : (
              <div className="p-8 text-center text-graphite">Loading...</div>
            )}
          </div>
        </div>
      </section>
    </RouteShell>
  );
}
