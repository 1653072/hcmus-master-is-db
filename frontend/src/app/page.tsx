'use client';

import { useEffect, useMemo, useState } from 'react';

import { SideAdRails } from '@/components/ads/PromoBanners';
import { FeaturedBook } from '@/components/books/book-card';
import { Footer } from '@/components/layout/Footer';
import { Header } from '@/components/layout/Header';
import { BooksGridSection } from '@/components/home/BooksGridSection';
import { CategoryPills } from '@/components/home/CategoryPills';
import { HeroSection } from '@/components/home/HeroSection';
import { OrderJourneySection } from '@/components/home/OrderJourneySection';
import { RankingSection } from '@/components/home/RankingSection';
import { booksApi } from '@/lib/api/books';
import { categoriesApi } from '@/lib/api/categories';
import { toFeaturedBook } from '@/lib/books';

function Loading() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-page items-center px-6 py-20 lg:px-10 xl:px-24">
      <div className="space-y-3">
        <div className="skeleton-shimmer h-3 w-24 rounded-full bg-stone-surface" />
        <div className="skeleton-shimmer h-9 w-72 rounded-full bg-stone-surface" />
        <div className="skeleton-shimmer h-4 w-96 max-w-full rounded-full bg-parchment" />
      </div>
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-page items-center px-6 py-20 lg:px-10 xl:px-24">
      <div
        className="max-w-xl rounded-cards bg-white px-6 py-5 text-[14px] text-coral-red"
        style={{ boxShadow: 'var(--shadow-subtle)' }}
      >
        <p className="font-medium">Trang chủ đang không tải được.</p>
        <p className="mt-2 text-graphite">{message}</p>
      </div>
    </div>
  );
}

export default function Page() {
  const [books, setBooks] = useState<FeaturedBook[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadHomepage() {
      try {
        setLoading(true);
        setError(null);
        const [booksRes, categoriesRes] = await Promise.all([
          booksApi.search({ page: 1, page_size: 10 }),
          categoriesApi.list({ page: 1, page_size: 12 }),
        ]);

        const bookList = Array.isArray((booksRes as any).data) ? ((booksRes as any).data as unknown[]) : [];
        const categoryList = Array.isArray((categoriesRes as any).data) ? (categoriesRes as any).data : [];

        if (!mounted) return;
        setBooks(bookList.map((book, index) => toFeaturedBook(book as any, index)));
        const uniqueCategories = Array.from(new Set(categoryList.map((category: any) => category.category_name || category.slug || 'Danh mục').filter(Boolean)));
        setCategories(uniqueCategories as string[]);
      } catch (err) {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : 'Không tải được sách ở trang chủ');
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadHomepage();
    return () => {
      mounted = false;
    };
  }, []);

  const featuredBooks = useMemo(() => books, [books]);

  return (
    <main className="min-h-screen bg-canvas text-graphite">
      <Header />
      <SideAdRails />
      <div className="space-y-0">
        {loading ? (
          <Loading />
        ) : error ? (
          <ErrorState message={error} />
        ) : (
          <>
            <HeroSection />
            <RankingSection titles={['Sách bán chạy', 'Xem nhiều trong tháng', 'Đang hot hôm nay']} />
            <CategoryPills categories={categories} />
            <BooksGridSection title="Gợi ý dành cho bạn" books={featuredBooks.slice(0, 4)} subtitle="Chọn nhanh các đầu sách đang có sẵn trong hệ thống." />
            <BooksGridSection title="Sách mới về" books={featuredBooks.slice(0, 5)} subtitle="Cập nhật từ kho sách mới nhất, sẵn sàng thêm vào giỏ." backgroundClassName="bg-parchment/50" />
            <OrderJourneySection />
            <Footer />
          </>
        )}
      </div>
    </main>
  );
}
