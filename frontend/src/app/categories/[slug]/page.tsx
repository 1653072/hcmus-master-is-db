'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

import { RouteShell } from '@/components/layout/RouteShell';
import { booksApi } from '@/lib/api/books';
import { toFeaturedBook } from '@/lib/books';
import type { FeaturedBook } from '@/components/books/book-card';

export default function Page() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug;
  const [books, setBooks] = useState<FeaturedBook[]>([]);
  const [categoryName, setCategoryName] = useState('Category');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadCategoryBooks() {
      try {
        setLoading(true);
        setError(null);
        const res = await booksApi.search({ page: 1, page_size: 24, query: slug });
        const list = Array.isArray((res as any).data) ? ((res as any).data as unknown[]) : [];
        if (!mounted) return;
        setBooks(list.map((book, index) => toFeaturedBook(book as never, index)));
        setCategoryName(slug ? slug.replace(/-/g, ' ') : 'Category');
      } catch (err) {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : 'Failed to load category books');
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadCategoryBooks();
    return () => {
      mounted = false;
    };
  }, [slug]);

  return (
    <RouteShell title={categoryName} subtitle="Books that help readers discover more in this theme.">
      <section className="mx-auto max-w-page px-6 pb-16 pt-0 lg:px-10 xl:px-24">
        <Link href="/categories" className="inline-flex items-center gap-2 text-sm font-medium text-graphite transition hover:text-charcoal">
          <span className="text-base">←</span> Back to categories
        </Link>

        {loading ? (
          <div className="mt-6 rounded-cards-lg border border-stone-surface bg-white p-6 text-sm text-graphite" style={{ boxShadow: 'var(--shadow-sm)' }}>
            Loading books...
          </div>
        ) : error ? (
          <div className="mt-6 rounded-cards-lg border border-coral-red/20 bg-coral-red/5 p-6 text-coral-red" style={{ boxShadow: 'var(--shadow-sm)' }}>
            <p className="font-semibold">Unable to load books</p>
            <p className="mt-2 text-sm text-graphite">{error}</p>
          </div>
        ) : (
          <>
            <div className="mt-6 rounded-cards-lg border border-stone-surface bg-white p-6" style={{ boxShadow: 'var(--shadow-sm)' }}>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-3">
                  <div className="h-1.5 w-14 rounded-full bg-ember/20" aria-hidden="true" />
                  <p className="text-xs font-semibold uppercase tracking-[0.28em] text-ash">Category</p>
                  <h1 className="font-display text-[clamp(2.5rem,5vw,4rem)] leading-[0.95] tracking-[-0.03em] text-charcoal">{categoryName}</h1>
                </div>
                <div className="rounded-full border border-stone-surface bg-parchment px-4 py-2 text-sm text-graphite">{books.length} books</div>
              </div>
            </div>

            <div className="mt-10 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
              {books.map((book) => (
                <article key={book.id ?? book.title} className="rounded-cards-lg border border-stone-surface bg-white p-4 transition duration-200 ease-out hover:-translate-y-0.5" style={{ boxShadow: 'var(--shadow-sm)' }}>
                  <div className="h-40 rounded-[18px]" style={{ background: book.image }} />
                  <div className="mt-4 flex items-start justify-between gap-4">
                    <div>
                      <h2 className="font-display text-[1.1rem] leading-tight text-charcoal">{book.title}</h2>
                      <p className="mt-1 text-sm text-graphite">by {book.author}</p>
                    </div>
                    <span className="rounded-full bg-ember/5 px-3 py-1 text-sm font-semibold text-ember">{book.price}</span>
                  </div>
                  <div className="mt-4 flex items-center justify-between border-t border-stone-surface pt-3 text-sm text-ash">
                    <span>Book</span>
                    <Link href={book.id ? `/books/${book.id}` : '/books'} className="font-medium text-charcoal transition hover:text-ember">
                      View
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          </>
        )}
      </section>
    </RouteShell>
  );
}
