'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { RouteShell } from '@/components/layout/RouteShell';
import { categoriesApi } from '@/lib/api/categories';

export default function Page() {
  const [categories, setCategories] = useState<Array<{ category_name: string; slug: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadCategories() {
      try {
        setLoading(true);
        setError(null);
        const res = await categoriesApi.list({ page: 1, page_size: 50 });
        const list = Array.isArray(res.data) ? res.data : [];
        if (!mounted) return;
        
        // Deduplicate and filter
        const validItems = list.filter((item: any) => Boolean(item?.category_name && item?.slug));
        const uniqueItems = Array.from(new Map(validItems.map((item: any) => [item.category_name, item])).values());
        
        setCategories(uniqueItems as any);
      } catch (err) {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : 'Failed to load categories');
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
    <RouteShell title="Categories" subtitle="Browse curated book collections by theme and discover what fits your reading mood.">
      <section className="mx-auto max-w-page px-6 pb-16 pt-0 lg:px-10 xl:px-24">
        {loading ? (
          <div className="rounded-cards-lg border border-stone-surface bg-white p-6 text-sm text-graphite" style={{ boxShadow: 'var(--shadow-sm)' }}>
            Loading categories...
          </div>
        ) : error ? (
          <div className="rounded-cards-lg border border-coral-red/20 bg-coral-red/5 p-6 text-coral-red" style={{ boxShadow: 'var(--shadow-sm)' }}>
            <p className="font-semibold">Unable to load categories</p>
            <p className="mt-2 text-sm text-graphite">{error}</p>
          </div>
        ) : (
          <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {categories.map((item, index) => (
              <Link
                key={item.slug}
                href={`/categories/${item.slug}`}
                className="group rounded-cards-lg border border-stone-surface bg-white p-5 transition duration-200 ease-out hover:-translate-y-0.5"
                style={{ boxShadow: 'var(--shadow-sm)' }}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="h-1.5 w-12 rounded-full bg-ember/20" aria-hidden="true" />
                    <h2 className="mt-4 font-display text-[1.55rem] leading-tight tracking-[-0.02em] text-charcoal">{item.category_name}</h2>
                    <p className="mt-2 max-w-xs text-sm leading-7 text-graphite">Browse curated books in this category.</p>
                  </div>
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-stone-surface bg-parchment text-graphite transition group-hover:border-ember/20 group-hover:bg-ember/5 group-hover:text-ember">
                    {index + 1}
                  </div>
                </div>
                <div className="mt-6 flex items-center justify-between border-t border-stone-surface pt-4 text-sm text-ash">
                  <span>Explore collection</span>
                  <span className="h-2 w-[5px] rounded-full bg-current" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </RouteShell>
  );
}
