'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { RankedBookTile } from '@/components/books/ranked-book-tile';
import { RouteShell } from '@/components/layout/RouteShell';
import { recommendationsApi } from '@/lib/api/recommendations';
import { toFeaturedBook } from '@/lib/books';
import { CommerceSection, CommerceSkeletonGrid, CommerceState, ProductGrid } from '@/components/ui/commerce';

export default function Page() {
  const [books, setBooks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadMostViewed() {
      try {
        setLoading(true);
        setError(null);
        const data = await recommendationsApi.getTopDailyViewed();
        setBooks(data || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Không tải được sách xem nhiều');
      } finally {
        setLoading(false);
      }
    }

    loadMostViewed();
  }, []);

  return (
    <RouteShell title="Xem nhiều hôm nay" subtitle="Những đầu sách đang được chú ý nhất trong ngày.">
      <CommerceSection className="pb-16 pt-10">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.24em] text-ash">Đang nổi bật</p>
            <p className="mt-2 text-sm text-graphite">Cập nhật theo lượt xem trong ngày.</p>
          </div>
          <Link href="/most-viewed/30days" className="inline-flex min-h-11 items-center rounded-buttons border border-stone-surface bg-white px-4 text-sm font-medium text-charcoal transition hover:border-graphite/30 hover:text-midnight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember/35">
            Xem 30 ngày
          </Link>
        </div>

        {loading ? (
          <CommerceSkeletonGrid count={8} />
        ) : error ? (
          <CommerceState title="Không tải được sách xem nhiều" message={error} tone="error" />
        ) : books.length > 0 ? (
          <ProductGrid>
            {books.map((book, index) => (
              <RankedBookTile
                key={book.book_id}
                id={book.book_id}
                title={book.title}
                rank={index + 1}
                metricLabel="Xem hôm nay"
                metricValue={`${book.view_count ?? 0} lượt`}
                book={toFeaturedBook({ ...book, id: book.book_id, name: book.title, image: book.cover_url }, index)}
              />
            ))}
          </ProductGrid>
        ) : (
          <CommerceState title="Chưa có dữ liệu lượt xem" message="Dữ liệu sẽ xuất hiện khi độc giả bắt đầu duyệt sách." />
        )}
      </CommerceSection>
    </RouteShell>
  );
}
