'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

import type { FeaturedBook } from '@/components/books/book-card';
import { BooksPage } from '@/components/books/BooksPage';
import { RouteShell } from '@/components/layout/RouteShell';
import { booksApi } from '@/lib/api/books';
import { toFeaturedBook } from '@/lib/books';

function BooksContent() {
  const searchParams = useSearchParams();
  const categoryParam = searchParams.get('category');
  const queryParam = searchParams.get('query') || searchParams.get('q');

  const [books, setBooks] = useState<FeaturedBook[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadBooks() {
      try {
        setLoading(true);
        setError(null);
        const queryTerm = categoryParam || queryParam || undefined;
        const res = await booksApi.search({ page: 1, page_size: 12, query: queryTerm });
        const list = Array.isArray((res as { books?: unknown }).books) ? ((res as { books?: unknown }).books as unknown[]) : [];
        if (!mounted) return;
        setBooks(list.map((book, index) => toFeaturedBook(book as never, index)));
      } catch (err) {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : 'Failed to load books');
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadBooks();
    return () => {
      mounted = false;
    };
  }, [categoryParam, queryParam]);

  return <BooksPage books={books} loading={loading} error={error} currentCategory={categoryParam} currentQuery={queryParam} />;
}

export default function Page() {
  return (
    <RouteShell title="Books" subtitle="Browse the full catalog, refine by filters, and jump into a detail page quickly.">
      <Suspense fallback={<div className="p-16 text-center text-sm font-medium text-zinc-500">Loading catalog...</div>}>
        <BooksContent />
      </Suspense>
    </RouteShell>
  );
}
