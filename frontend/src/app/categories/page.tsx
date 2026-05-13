'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { RouteShell } from '@/components/layout/RouteShell';
import { CommerceSection, CommerceState } from '@/components/ui/commerce';
import { categoriesApi, type Category } from '@/lib/api/categories';

export default function Page() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadCategories() {
      try {
        setLoading(true);
        setError(null);
        const list = await categoriesApi.listAll();
        if (!mounted) return;

        const validItems = list.filter((item) => Boolean(item.category_name && (item.slug || item.id)));
        setCategories(validItems);
      } catch (err) {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : 'Không tải được danh mục');
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadCategories();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <RouteShell title="Danh mục" subtitle="Duyệt các tủ sách theo chủ đề để tìm đúng gu đọc.">
      <CommerceSection className="pb-16 pt-8">
        {loading ? (
          <div className="rounded-cards-lg border border-stone-surface bg-white p-6 text-sm text-graphite" style={{ boxShadow: 'var(--shadow-sm)' }}>
            Đang tải danh mục...
          </div>
        ) : error ? (
          <CommerceState title="Không tải được danh mục" message={error} tone="error" />
        ) : (
          <div>
            <p className="mb-5 text-sm font-medium text-ash">
              Đang hiển thị <span className="text-charcoal">{categories.length}</span> danh mục.
            </p>
            <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {categories.map((item, index) => (
                <Link
                  key={item.slug || item.id}
                  href={`/categories/${item.slug || item.id}`}
                  className="group rounded-cards-lg border border-stone-surface bg-white p-5 transition duration-200 ease-out hover:-translate-y-0.5"
                  style={{ boxShadow: 'var(--shadow-sm)' }}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="h-1.5 w-12 rounded-full bg-ember/20" aria-hidden="true" />
                      <h2 className="mt-4 font-display text-[1.55rem] leading-tight text-charcoal">{item.category_name}</h2>
                      <p className="mt-2 max-w-xs text-sm leading-7 text-graphite">Xem các đầu sách đang có trong danh mục này.</p>
                    </div>
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-stone-surface bg-parchment text-graphite transition group-hover:border-ember/20 group-hover:bg-ember/5 group-hover:text-ember">
                      {index + 1}
                    </div>
                  </div>
                  <div className="mt-6 flex items-center justify-between border-t border-stone-surface pt-4 text-sm text-ash">
                    <span>Khám phá tủ sách</span>
                    <span className="h-2 w-[5px] rounded-full bg-current" />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </CommerceSection>
    </RouteShell>
  );
}
