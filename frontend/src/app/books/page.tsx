'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

import type { FeaturedBook } from '@/components/books/book-card';
import { BooksPage } from '@/components/books/BooksPage';
import { RouteShell } from '@/components/layout/RouteShell';
import { booksApi } from '@/lib/api/books';
import { toFeaturedBook } from '@/lib/books';

import { categoriesApi, type Category } from '@/lib/api/categories';

function BooksContent() {
  const searchParams = useSearchParams();
  const categoryParam = searchParams.get('category');
  const queryParam = searchParams.get('query') || searchParams.get('q');

  const [books, setBooks] = useState<FeaturedBook[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadData() {
      try {
        setLoading(true);
        setError(null);
        const queryTerm = categoryParam || queryParam || undefined;
        
        const [booksRes, categoriesList] = await Promise.all([
          booksApi.search({ page: 1, page_size: 12, query: queryTerm }),
          categoriesApi.list().catch(() => []),
        ]);

        if (!mounted) return;
        
        const list = Array.isArray((booksRes as any).data) ? ((booksRes as any).data as unknown[]) : [];
        setBooks(list.map((book, index) => toFeaturedBook(book as never, index)));
        
        // Filter out empty category names and deduplicate
        const rawCategories = Array.isArray((categoriesList as any).data) ? (categoriesList as any).data : [];
        const uniqueCats = Array.from(new Map(rawCategories.filter((c: Category) => c.category_name && c.category_name.trim() !== '').map((c: Category) => [c.category_name, c])).values());
        setCategories(uniqueCats as Category[]);
      } catch (err) {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : 'Failed to load data');
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadData();
    return () => {
      mounted = false;
    };
  }, [categoryParam, queryParam]);

  return <BooksPage books={books} categories={categories} loading={loading} error={error} currentCategory={categoryParam} currentQuery={queryParam} />;
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
