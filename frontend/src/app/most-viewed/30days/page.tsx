'use client';

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
        const data = await recommendationsApi.getTopMostViewed30Days();
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
    <RouteShell title="Xem nhiều trong 30 ngày" subtitle="Xu hướng đọc theo lượt xem tích lũy trong tháng.">
      <CommerceSection className="pb-16 pt-10">
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
                metricLabel="Xem 30 ngày"
                metricValue={`${book.view_count ?? 0} lượt`}
                book={toFeaturedBook({ ...book, id: book.book_id, name: book.title, image: book.cover_url }, index)}
              />
            ))}
          </ProductGrid>
        ) : (
          <CommerceState title="Chưa có dữ liệu 30 ngày" message="Dữ liệu sẽ xuất hiện khi có lượt xem tích lũy." />
        )}
      </CommerceSection>
    </RouteShell>
  );
}
