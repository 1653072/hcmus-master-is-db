'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

import type { FeaturedBook } from '@/components/books/book-card';
import { BooksPage } from '@/components/books/BooksPage';
import { RouteShell } from '@/components/layout/RouteShell';
import { booksApi } from '@/lib/api/books';
import { toFeaturedBook } from '@/lib/books';

import { categoriesApi, type Category } from '@/lib/api/categories';

function BooksContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const searchParamsString = searchParams.toString();
  const categoryParam = searchParams.get('category');
  const authorParam = searchParams.get('author');
  const queryParam = searchParams.get('search') || searchParams.get('query') || searchParams.get('q');
  const publisherParam = searchParams.get('publisher');
  const yearParam = searchParams.get('year');
  const minPriceParam = searchParams.get('min_price');
  const maxPriceParam = searchParams.get('max_price');
  const parsedPage = Number(searchParams.get('page') || '1');
  const pageParam = Number.isFinite(parsedPage) && parsedPage > 0 ? Math.floor(parsedPage) : 1;

  const [books, setBooks] = useState<FeaturedBook[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [total, setTotal] = useState(0);
  const pageSize = 12;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadData() {
      try {
        setLoading(true);
        setError(null);
        const [booksRes, categoriesList] = await Promise.all([
          booksApi.search({
            page: pageParam,
            page_size: pageSize,
            search: queryParam || undefined,
            category: categoryParam || undefined,
            author: authorParam || undefined,
            publisher: publisherParam || undefined,
            year: yearParam ? Number(yearParam) : undefined,
            min_price: minPriceParam ? Number(minPriceParam) : undefined,
            max_price: maxPriceParam ? Number(maxPriceParam) : undefined,
          }),
          categoriesApi.list().catch(() => []),
        ]);

        if (!mounted) return;
        
        const list = Array.isArray((booksRes as any).data) ? ((booksRes as any).data as unknown[]) : [];
        const nextTotal = Number((booksRes as any).total ?? list.length);
        const totalPages = Math.max(1, Math.ceil(nextTotal / pageSize));
        if (pageParam > totalPages) {
          const nextParams = new URLSearchParams(searchParamsString);
          nextParams.set('page', String(totalPages));
          router.replace(`/books?${nextParams.toString()}`);
          return;
        }
        setBooks(list.map((book, index) => toFeaturedBook(book as any, index)));
        setTotal(nextTotal);
        
        // Filter out empty category names and deduplicate
        const rawCategories = Array.isArray((categoriesList as any).data) ? (categoriesList as any).data : [];
        const uniqueCats = Array.from(new Map(rawCategories.filter((c: Category) => c.category_name && c.category_name.trim() !== '').map((c: Category) => [c.category_name, c])).values());
        setCategories(uniqueCats as Category[]);
      } catch (err) {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : 'Không tải được dữ liệu kho sách');
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadData();
    return () => {
      mounted = false;
    };
  }, [authorParam, categoryParam, maxPriceParam, minPriceParam, pageParam, publisherParam, queryParam, router, searchParamsString, yearParam]);

  return (
    <BooksPage
      books={books}
      categories={categories}
      loading={loading}
      error={error}
      currentCategory={categoryParam}
      currentAuthor={authorParam}
      currentQuery={queryParam}
      currentPublisher={publisherParam}
      currentYear={yearParam}
      currentMinPrice={minPriceParam}
      currentMaxPrice={maxPriceParam}
      page={pageParam}
      pageSize={pageSize}
      total={total}
    />
  );
}

export default function Page() {
  return (
    <RouteShell title="Kho sách" subtitle="Tìm và lọc sách theo từ khóa, tác giả, nhà xuất bản, năm xuất bản và khoảng giá.">
      <Suspense fallback={<div className="p-16 text-center text-sm font-medium text-zinc-500">Đang tải kho sách...</div>}>
        <BooksContent />
      </Suspense>
    </RouteShell>
  );
}
