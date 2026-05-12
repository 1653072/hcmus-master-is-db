'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { RouteShell } from '@/components/layout/RouteShell';
import { recommendationsApi } from '@/lib/api/recommendations';
import { CommerceSection, CommercePanel, CommerceState } from '@/components/ui/commerce';

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
        <CommercePanel>
          <div className="mb-6 flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.24em] text-ash">Đang nổi bật</p>
              <p className="mt-2 text-sm text-graphite">Cập nhật theo lượt xem trong ngày.</p>
            </div>
            <Link href="/most-viewed/30days" className="inline-flex min-h-11 items-center rounded-full border border-stone-surface bg-white px-4 text-sm font-medium text-charcoal transition hover:border-graphite/30 hover:text-midnight">
              Xem 30 ngày
            </Link>
          </div>

          <div className="space-y-3">
            {loading ? (
              <div className="p-8 text-center text-graphite">Đang tải...</div>
            ) : error ? (
              <CommerceState title="Không tải được sách xem nhiều" message={error} tone="error" />
            ) : books.length > 0 ? books.map((book, index) => (
              <Link href={`/books/${book.book_id}`} key={book.book_id}>
                <article className="flex items-center gap-4 rounded-[22px] border border-stone-surface bg-parchment px-4 py-4 transition hover:-translate-y-0.5">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-ember/5 font-display text-xl tracking-[-0.02em] text-ember">
                    {String(index + 1).padStart(2, '0')}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="truncate font-display text-[1.15rem] leading-tight tracking-[-0.02em] text-charcoal group-hover:text-ember transition">{book.title}</h2>
                    <p className="mt-1 text-sm text-graphite">Xem nhiều hôm nay</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-charcoal">{book.view_count} lượt xem</p>
                    <p className="text-xs text-ash">Xếp hạng live</p>
                  </div>
                </article>
              </Link>
            )) : (
              <CommerceState title="Chưa có dữ liệu lượt xem" message="Dữ liệu sẽ xuất hiện khi độc giả bắt đầu duyệt sách." />
            )}
          </div>
        </CommercePanel>
      </CommerceSection>
    </RouteShell>
  );
}
