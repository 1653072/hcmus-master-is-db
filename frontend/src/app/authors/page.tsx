'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { RouteShell } from '@/components/layout/RouteShell';
import { booksApi } from '@/lib/api/books';
import type { BookAuthor } from '@/lib/types';

type AuthorSummary = BookAuthor & {
  book_count: number;
};

export default function Page() {
  const [authors, setAuthors] = useState<AuthorSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadAuthors() {
      try {
        setLoading(true);
        setError(null);
        const pageSize = 100;
        let page = 1;
        let total = 0;
        const books: any[] = [];

        do {
          const res = await booksApi.search({ page, page_size: pageSize });
          const data = Array.isArray((res as any).data) ? (res as any).data : [];
          if (data.length === 0) break;
          books.push(...data);
          total = Number((res as any).total ?? books.length);
          page += 1;
        } while (books.length < total);

        const byName = new Map<string, AuthorSummary>();

        books.forEach((book: any) => {
          (book.authors ?? []).forEach((author: BookAuthor) => {
            if (!author?.author_name) return;
            const existing = byName.get(author.author_name);
            byName.set(author.author_name, {
              author_id: author.author_id || author.author_name,
              slug: author.slug || author.author_name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
              author_name: author.author_name,
              book_count: (existing?.book_count ?? 0) + 1,
            });
          });
        });

        if (!mounted) return;
        setAuthors(Array.from(byName.values()).sort((a, b) => a.author_name.localeCompare(b.author_name)));
      } catch (err) {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : 'Không tải được tác giả từ kho sách');
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadAuthors();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <RouteShell title="Tác giả" subtitle="Danh sách tác giả được tổng hợp từ kho sách đang có.">
      <section className="mx-auto max-w-page px-6 pb-16 pt-10 lg:px-10 xl:px-24">
        {loading ? (
          <div className="rounded-cards-lg border border-stone-surface bg-white p-6 text-sm text-graphite" style={{ boxShadow: 'var(--shadow-sm)' }}>
            Đang tải tác giả...
          </div>
        ) : error ? (
          <div className="rounded-cards-lg border border-coral-red/20 bg-coral-red/5 p-6 text-coral-red" style={{ boxShadow: 'var(--shadow-sm)' }}>
            <p className="font-medium">Không tải được tác giả</p>
            <p className="mt-2 text-sm text-graphite">{error}</p>
          </div>
        ) : authors.length === 0 ? (
          <div className="rounded-cards-lg border border-dashed border-stone-surface bg-parchment p-12 text-center text-sm text-graphite">
            Chưa có tác giả trong kho sách.
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {authors.map((author) => (
              <Link
                key={author.author_name}
                href={`/books?author=${encodeURIComponent(author.author_name)}`}
                className="group rounded-cards-lg bg-white p-5 transition duration-200 hover:-translate-y-0.5 hover:shadow-card-hover"
                style={{ boxShadow: 'var(--shadow-subtle)' }}
              >
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-parchment font-display text-2xl text-charcoal">
                  {author.author_name.slice(0, 1).toUpperCase()}
                </div>
                <h2 className="mt-4 text-[19px] font-semibold tracking-[-0.25px] text-charcoal group-hover:text-ember">{author.author_name}</h2>
                <p className="mt-2 text-[13px] tracking-[-0.17px] text-graphite">
                  {author.book_count} dau sach trong kho
                </p>
              </Link>
            ))}
          </div>
        )}
      </section>
    </RouteShell>
  );
}
