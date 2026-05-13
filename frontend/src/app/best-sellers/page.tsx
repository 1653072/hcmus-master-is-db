'use client';

import { useEffect, useState } from 'react';

import { RankedBookTile } from '@/components/books/ranked-book-tile';
import { RouteShell } from '@/components/layout/RouteShell';
import { CommerceSection, CommerceSkeletonGrid, CommerceState, ProductGrid } from '@/components/ui/commerce';
import { recommendationsApi } from '@/lib/api/recommendations';
import { toFeaturedBook } from '@/lib/books';

export default function Page() {
  const [books, setBooks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadBestSellers() {
      try {
        setLoading(true);
        setError(null);
        const data = await recommendationsApi.getBestSellers();
        setBooks(data || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Không tải được sách bán chạy');
      } finally {
        setLoading(false);
      }
    }

    loadBestSellers();
  }, []);

  return (
    <RouteShell title="Sách bán chạy" subtitle="Bảng xếp hạng những đầu sách được độc giả mua nhiều nhất.">
      <CommerceSection className="pb-16 pt-10">
        {loading ? (
          <CommerceSkeletonGrid count={8} />
        ) : error ? (
          <CommerceState title="Không tải được sách bán chạy" message={error} tone="error" />
        ) : books.length > 0 ? (
          <ProductGrid>
            {books.map((book, index) => (
              <RankedBookTile
                key={book.book_id}
                id={book.book_id}
                title={book.title}
                rank={index + 1}
                metricLabel="Sách bán chạy"
                metricValue={`${book.total_sold ?? 0} cuốn`}
                book={toFeaturedBook({ ...book, id: book.book_id, name: book.title, image: book.cover_url }, index)}
              />
            ))}
          </ProductGrid>
        ) : (
          <CommerceState title="Chưa có dữ liệu sách bán chạy" message="Bảng xếp hạng sẽ cập nhật khi có đơn hàng hoàn tất." />
        )}
      </CommerceSection>
    </RouteShell>
  );
}
