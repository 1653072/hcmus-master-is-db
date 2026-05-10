'use client';

import { useEffect, useMemo, useState } from 'react';

import { FeaturedBook } from '@/components/books/book-card';
import { Footer } from '@/components/layout/Footer';
import { Header } from '@/components/layout/Header';
import { BooksGridSection } from '@/components/home/BooksGridSection';
import { CategoryPills } from '@/components/home/CategoryPills';
import { HeroSection } from '@/components/home/HeroSection';
import { RankingSection } from '@/components/home/RankingSection';
import { ServicesSection } from '@/components/home/ServicesSection';
import { TestimonialsSection } from '@/components/home/TestimonialsSection';
import { TrendingSection } from '@/components/home/TrendingSection';
import { booksApi } from '@/lib/api/books';
import { categoriesApi } from '@/lib/api/categories';
import { toFeaturedBook } from '@/lib/books';

function Loading() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-page items-center px-6 py-20 lg:px-10 xl:px-24">
      <div className="space-y-3">
        <div className="h-3 w-24 rounded-full bg-stone-surface" />
        <div className="h-9 w-72 rounded-full bg-stone-surface" />
        <div className="h-4 w-96 max-w-full rounded-full bg-parchment" />
      </div>
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-page items-center px-6 py-20 lg:px-10 xl:px-24">
      <div
        className="max-w-xl rounded-cards bg-white px-6 py-5 text-[14px] text-coral-red"
        style={{ boxShadow: '#f2f0ed 0px 0px 0px 1px inset' }}
      >
        <p className="font-medium">We could not load the homepage right now.</p>
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
        setBooks(bookList.map((book, index) => toFeaturedBook(book as never, index)));
        const uniqueCategories = Array.from(new Set(categoryList.map((category: any) => category.category_name || category.slug || 'Category').filter(Boolean)));
        setCategories(uniqueCategories as string[]);
      } catch (err) {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : 'Failed to load homepage books');
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

  const trending = featuredBooks.slice(0, 4);
  const services = [
    { title: 'Free shipping', desc: 'Anywhere in Bangladesh', icon: '🚚' },
    { title: 'Cash on delivery', desc: 'Pay when the order arrives', icon: '💵' },
    { title: 'Support that answers', desc: 'Quick help when you need it', icon: '🎧' },
    { title: 'Easy returns', desc: 'Within 14 days', icon: '↩' },
  ];
  const testimonials = [
    'This book was an absolute page-turner. I could not put it down and stayed with it from start to finish.',
    'The storefront makes it easy to compare picks, and the recommendations feel genuinely useful.',
    'Fast to browse, calm to use, and the product detail pages make shopping feel effortless.',
  ];

  return (
    <main className="min-h-screen bg-canvas text-graphite">
      <Header />
      <div className="space-y-0">
        {loading ? (
          <Loading />
        ) : error ? (
          <ErrorState message={error} />
        ) : (
          <>
            <HeroSection books={featuredBooks.slice(0, 3)} />
            <RankingSection titles={['Best sellers', 'Most viewed this month', 'Trending today']} />
            <CategoryPills categories={categories} />
            <BooksGridSection title="Recommended for you" books={featuredBooks.slice(0, 4)} subtitle="Books picked for quick discovery and easy comparison." columnsClassName="grid-cols-2 gap-4 md:grid-cols-4" />
            <BooksGridSection title="Recently added" books={featuredBooks.slice(0, 5)} subtitle="Fresh arrivals, ready to browse." columnsClassName="grid-cols-2 gap-5 md:grid-cols-3 xl:grid-cols-5" backgroundClassName="bg-parchment/50" />
            <TrendingSection books={trending} />
            <ServicesSection services={services} />
            <TestimonialsSection testimonials={testimonials} />
            <Footer />
          </>
        )}
      </div>
    </main>
  );
}
