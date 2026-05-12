'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

import { RouteShell } from '@/components/layout/RouteShell';
import { booksApi } from '@/lib/api/books';
import { categoriesApi } from '@/lib/api/categories';
import { toFeaturedBook } from '@/lib/books';
import type { FeaturedBook } from '@/components/books/book-card';
import { BookCard } from '@/components/books/book-card';
import { CommerceSection, CommerceState, ProductGrid } from '@/components/ui/commerce';

export default function Page() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug;
  const [books, setBooks] = useState<FeaturedBook[]>([]);
  const [categoryName, setCategoryName] = useState('Danh mục');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadCategoryBooks() {
      try {
        setLoading(true);
        setError(null);
        const categoriesRes = await categoriesApi.list({ page: 1, page_size: 100 });
        const categories = Array.isArray((categoriesRes as any).data) ? (categoriesRes as any).data : [];
        const category = categories.find((item: any) => item.slug === slug || item.id === slug);
        const categoryID = category?.id || slug;
        const res = await booksApi.search({ page: 1, page_size: 24, category: categoryID });
        const list = Array.isArray((res as any).data) ? ((res as any).data as unknown[]) : [];
        if (!mounted) return;
        setBooks(list.map((book, index) => toFeaturedBook(book as any, index)));
        setCategoryName(category?.category_name || (slug ? slug.replace(/-/g, ' ') : 'Danh mục'));
      } catch (err) {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : 'Không tải được sách trong danh mục');
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
    <RouteShell title={categoryName} subtitle="Các đầu sách giúp bạn khám phá thêm trong chủ đề này.">
      <CommerceSection className="pb-16 pt-0">
        <Link href="/categories" className="inline-flex items-center gap-2 text-sm font-medium text-graphite transition hover:text-charcoal">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Quay lại danh mục
        </Link>

        {loading ? (
          <div className="mt-6 rounded-cards-lg border border-stone-surface bg-white p-6 text-sm text-graphite" style={{ boxShadow: 'var(--shadow-sm)' }}>
            Đang tải sách...
          </div>
        ) : error ? (
          <div className="mt-6 rounded-cards-lg border border-coral-red/20 bg-coral-red/5 p-6 text-coral-red" style={{ boxShadow: 'var(--shadow-sm)' }}>
            <p className="font-medium">Không tải được sách</p>
            <p className="mt-2 text-sm text-graphite">{error}</p>
          </div>
        ) : (
          <>
            <div className="mt-6 rounded-cards-lg border border-stone-surface bg-white p-6" style={{ boxShadow: 'var(--shadow-sm)' }}>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-3">
                  <div className="h-1.5 w-14 rounded-full bg-ember/20" aria-hidden="true" />
                  <p className="text-xs font-medium uppercase tracking-[0.24em] text-ash">Danh mục</p>
                  <h1 className="font-display text-[clamp(2.5rem,5vw,4rem)] leading-none text-charcoal">{categoryName}</h1>
                </div>
                <div className="rounded-full border border-stone-surface bg-parchment px-4 py-2 text-sm text-graphite">{books.length} sách</div>
              </div>
            </div>

            {books.length === 0 ? (
              <div className="mt-8">
                <CommerceState title="Chưa có sách trong danh mục" message="Bạn có thể quay lại kho sách để xem các danh mục khác." actionHref="/books" actionLabel="Mở kho sách" />
              </div>
            ) : (
            <ProductGrid className="mt-10">
              {books.map((book) => (
                <Link key={book.id ?? book.title} href={book.id ? `/books/${book.id}` : '/books'} className="block rounded-cards transition duration-200 ease-out hover:-translate-y-0.5">
                  <BookCard book={book} compact />
                </Link>
              ))}
            </ProductGrid>
            )}
          </>
        )}
      </CommerceSection>
    </RouteShell>
  );
}
