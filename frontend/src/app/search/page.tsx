'use client';

import Link from 'next/link';
import { Suspense, useEffect, useState, type FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search } from 'lucide-react';

import { BookCard, type FeaturedBook } from '@/components/books/book-card';
import { RouteShell } from '@/components/layout/RouteShell';
import { Button } from '@/components/ui/button';
import { CommerceSection, CommerceSkeletonGrid, CommerceState, ProductGrid } from '@/components/ui/commerce';
import { booksApi } from '@/lib/api/books';
import { toFeaturedBook } from '@/lib/books';

function SearchContent() {
  const router = useRouter();
  const params = useSearchParams();
  const q = params.get('q') || params.get('query') || '';
  const [term, setTerm] = useState(q);
  const [books, setBooks] = useState<FeaturedBook[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(Boolean(q));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setTerm(q);
    if (!q) {
      setBooks([]);
      setTotal(0);
      setLoading(false);
      return;
    }

    let mounted = true;
    async function searchBooks() {
      try {
        setLoading(true);
        setError(null);
        const res = await booksApi.search({ page: 1, page_size: 24, search: q });
        const list = Array.isArray((res as any).data) ? (res as any).data : [];
        if (!mounted) return;
        setBooks(list.map((book: never, index: number) => toFeaturedBook(book, index)));
        setTotal(Number((res as any).total ?? list.length));
      } catch (err) {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : 'Không thể tìm kiếm sách');
      } finally {
        if (mounted) setLoading(false);
      }
    }

    searchBooks();
    return () => {
      mounted = false;
    };
  }, [q]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const value = term.trim();
    router.push(value ? `/search?q=${encodeURIComponent(value)}` : '/search');
  };

  return (
    <CommerceSection className="pb-16 pt-0">
      <form onSubmit={handleSubmit} className="rounded-cards-lg border border-stone-surface bg-white p-6" style={{ boxShadow: 'var(--shadow-sm)' }}>
        <label className="block">
          <span className="mb-2 block text-xs font-medium uppercase tracking-[0.24em] text-ash">Tìm trong kho sách</span>
          <span className="flex items-center gap-3 rounded-full border border-stone-surface bg-parchment px-5 py-3 transition focus-within:border-ember focus-within:bg-white focus-within:ring-2 focus-within:ring-ember/20">
            <Search className="h-4 w-4 text-ash" />
            <input
              type="search"
              value={term}
              onChange={(event) => setTerm(event.target.value)}
              placeholder="Nhập tên sách, tác giả, thể loại"
              className="w-full bg-transparent text-sm text-charcoal outline-none placeholder:text-smoke"
            />
            <Button type="submit" size="sm">Tìm</Button>
          </span>
        </label>
      </form>

      {loading ? (
        <div className="mt-8"><CommerceSkeletonGrid count={4} /></div>
      ) : error ? (
        <div className="mt-8"><CommerceState title="Không thể tìm kiếm" message={error} tone="error" /></div>
      ) : q ? (
        <div className="mt-8">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.24em] text-ash">Kết quả</p>
              <h2 className="mt-2 font-display text-[clamp(2rem,4vw,3rem)] leading-none text-charcoal">
                {total} kết quả cho &ldquo;{q}&rdquo;
              </h2>
            </div>
            <Link href={`/books?search=${encodeURIComponent(q)}`} className="text-sm font-medium text-ember hover:text-coral-red">
              Mở trong kho sách
            </Link>
          </div>
          {books.length === 0 ? (
            <CommerceState title="Chưa có sách khớp với từ khóa này" message="Thử từ khóa ngắn hơn hoặc mở kho sách để lọc theo danh mục." />
          ) : (
            <ProductGrid>
              {books.map((book) => (
                <Link key={book.id ?? book.title} href={book.id ? `/books/${book.id}` : '/books'} className="block rounded-cards transition duration-200 ease-out hover:-translate-y-0.5">
                  <BookCard book={book} compact />
                </Link>
              ))}
            </ProductGrid>
          )}
        </div>
      ) : (
        <div className="mt-8"><CommerceState title="Nhập từ khóa để bắt đầu" message="Bạn có thể tìm theo tên sách, tác giả hoặc chủ đề đang quan tâm." /></div>
      )}
    </CommerceSection>
  );
}

export default function Page() {
  return (
    <RouteShell title="Tìm kiếm sách" subtitle="Tìm theo từ khóa, tác giả, danh mục hoặc chủ đề bạn đang quan tâm.">
      <Suspense fallback={<div className="p-16 text-center text-sm font-medium text-zinc-500">Đang tải tìm kiếm...</div>}>
        <SearchContent />
      </Suspense>
    </RouteShell>
  );
}
