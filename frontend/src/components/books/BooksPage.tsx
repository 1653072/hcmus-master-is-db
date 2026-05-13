import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState, type FormEvent } from 'react';

import { BookCard, type FeaturedBook } from '@/components/books/book-card';
import { Button } from '@/components/ui/button';
import { CommerceSection, CommerceSkeletonGrid, CommerceState, ProductGrid } from '@/components/ui/commerce';

import { type Category } from '@/lib/api/categories';

interface BooksPageProps {
  books: FeaturedBook[];
  categories?: Category[];
  loading?: boolean;
  error?: string | null;
  currentCategory?: string | null;
  currentAuthor?: string | null;
  currentQuery?: string | null;
  currentPublisher?: string | null;
  currentYear?: string | null;
  currentMinPrice?: string | null;
  currentMaxPrice?: string | null;
  page?: number;
  pageSize?: number;
  total?: number;
}

const priceRanges = [
  { label: 'Dưới 100K', min: undefined, max: '100000' },
  { label: '100K - 250K', min: '100000', max: '250000' },
  { label: '250K - 500K', min: '250000', max: '500000' },
  { label: 'Trên 500K', min: '500000', max: undefined },
];

function paginationItems(currentPage: number, totalPages: number) {
  const pages = new Set<number>([1, totalPages, currentPage, currentPage - 1, currentPage + 1]);
  return Array.from(pages)
    .filter((item) => item >= 1 && item <= totalPages)
    .sort((a, b) => a - b)
    .reduce<Array<number | 'ellipsis'>>((items, item) => {
      const previous = items[items.length - 1];
      if (typeof previous === 'number' && item - previous > 1) {
        items.push('ellipsis');
      }
      items.push(item);
      return items;
    }, []);
}

function LoadingState() {
  return <CommerceSkeletonGrid />;
}

function ErrorState({ message }: { message: string }) {
  return (
    <CommerceState title="Không tải được danh sách sách" message={message} actionHref="/books" actionLabel="Thử lại" tone="error" />
  );
}

export function BooksPage({
  books,
  categories = [],
  loading = false,
  error = null,
  currentCategory,
  currentAuthor,
  currentQuery,
  currentPublisher,
  currentYear,
  currentMinPrice,
  currentMaxPrice,
  page = 1,
  pageSize = 12,
  total = books.length,
}: BooksPageProps) {
  const router = useRouter();
  const [queryInput, setQueryInput] = useState(currentQuery ?? '');
  const [authorInput, setAuthorInput] = useState(currentAuthor ?? '');
  const [publisherInput, setPublisherInput] = useState(currentPublisher ?? '');
  const [yearInput, setYearInput] = useState(currentYear ?? '');
  const [minPriceInput, setMinPriceInput] = useState(currentMinPrice ?? '');
  const [maxPriceInput, setMaxPriceInput] = useState(currentMaxPrice ?? '');
  const safePage = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
  const safePageSize = Number.isFinite(pageSize) && pageSize > 0 ? pageSize : 12;

  useEffect(() => {
    setQueryInput(currentQuery ?? '');
    setAuthorInput(currentAuthor ?? '');
    setPublisherInput(currentPublisher ?? '');
    setYearInput(currentYear ?? '');
    setMinPriceInput(currentMinPrice ?? '');
    setMaxPriceInput(currentMaxPrice ?? '');
  }, [currentAuthor, currentMaxPrice, currentMinPrice, currentPublisher, currentQuery, currentYear]);

  const buildHref = (updates: Record<string, string | undefined>) => {
    const params = new URLSearchParams();
    if (currentQuery) params.set('search', currentQuery);
    if (currentCategory) params.set('category', currentCategory);
    if (currentAuthor) params.set('author', currentAuthor);
    if (currentPublisher) params.set('publisher', currentPublisher);
    if (currentYear) params.set('year', currentYear);
    if (currentMinPrice) params.set('min_price', currentMinPrice);
    if (currentMaxPrice) params.set('max_price', currentMaxPrice);
    params.set('page', String(safePage));

    Object.entries(updates).forEach(([key, value]) => {
      if (value) params.set(key, value);
      else params.delete(key);
    });

    if (updates.page === undefined) params.delete('page');
    const query = params.toString();
    return query ? `/books?${query}` : '/books';
  };

  const applyAdvancedFilters = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    router.push(buildHref({
      search: queryInput.trim() || undefined,
      author: authorInput.trim() || undefined,
      publisher: publisherInput.trim() || undefined,
      year: yearInput.trim() || undefined,
      min_price: minPriceInput.trim() || undefined,
      max_price: maxPriceInput.trim() || undefined,
      page: undefined,
    }));
  };

  const clearFilters = () => router.push('/books');

  const totalPages = Math.max(1, Math.ceil(total / safePageSize));
  const visiblePages = paginationItems(Math.min(safePage, totalPages), totalPages);

  return (
    <CommerceSection className="pb-16 pt-4">
      <div className="grid gap-8 lg:grid-cols-[280px_minmax(0,1fr)] lg:items-start">
        <aside className="rounded-cards-lg border border-stone-surface bg-white p-5 lg:sticky lg:top-44" style={{ boxShadow: 'var(--shadow-sm)' }}>
          <div className="space-y-2">
            <div className="h-1.5 w-14 rounded-full bg-orange-200" aria-hidden="true" />
            <p className="text-xs font-medium uppercase tracking-[0.24em] text-zinc-500">Bộ lọc</p>
          </div>

          <div className="mt-6 space-y-6">
            <form onSubmit={applyAdvancedFilters} className="space-y-4">
              <label className="block">
                <span className="text-sm font-medium text-zinc-900">Từ khóa</span>
                <input
                  type="search"
                  value={queryInput}
                  onChange={(event) => setQueryInput(event.target.value)}
                  placeholder="Tên sách, mô tả, tag"
                  className="mt-2 h-10 w-full rounded-inputs border border-stone-surface bg-white px-3 text-sm text-charcoal outline-none transition focus:border-ember focus:ring-2 focus:ring-ember/15"
                />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-zinc-900">Tác giả</span>
                <input
                  type="text"
                  value={authorInput}
                  onChange={(event) => setAuthorInput(event.target.value)}
                  placeholder="Ví dụ: Nam Cao"
                  className="mt-2 h-10 w-full rounded-inputs border border-stone-surface bg-white px-3 text-sm text-charcoal outline-none transition focus:border-ember focus:ring-2 focus:ring-ember/15"
                />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-zinc-900">Nhà xuất bản</span>
                <input
                  type="text"
                  value={publisherInput}
                  onChange={(event) => setPublisherInput(event.target.value)}
                  placeholder="NXB hoặc publisher"
                  className="mt-2 h-10 w-full rounded-inputs border border-stone-surface bg-white px-3 text-sm text-charcoal outline-none transition focus:border-ember focus:ring-2 focus:ring-ember/15"
                />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-sm font-medium text-zinc-900">Năm</span>
                  <input
                    type="number"
                    min="0"
                    value={yearInput}
                    onChange={(event) => setYearInput(event.target.value)}
                    placeholder="2024"
                    className="mt-2 h-10 w-full rounded-inputs border border-stone-surface bg-white px-3 text-sm text-charcoal outline-none transition focus:border-ember focus:ring-2 focus:ring-ember/15"
                  />
                </label>
                <div>
                  <span className="text-sm font-medium text-zinc-900">Thao tác</span>
                  <Button type="submit" size="sm" className="mt-2 w-full">Áp dụng</Button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-sm font-medium text-zinc-900">Giá từ</span>
                  <input
                    type="number"
                    min="0"
                    value={minPriceInput}
                    onChange={(event) => setMinPriceInput(event.target.value)}
                    placeholder="0"
                    className="mt-2 h-10 w-full rounded-inputs border border-stone-surface bg-white px-3 text-sm text-charcoal outline-none transition focus:border-ember focus:ring-2 focus:ring-ember/15"
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-medium text-zinc-900">Giá đến</span>
                  <input
                    type="number"
                    min="0"
                    value={maxPriceInput}
                    onChange={(event) => setMaxPriceInput(event.target.value)}
                    placeholder="500000"
                    className="mt-2 h-10 w-full rounded-inputs border border-stone-surface bg-white px-3 text-sm text-charcoal outline-none transition focus:border-ember focus:ring-2 focus:ring-ember/15"
                  />
                </label>
              </div>
              <Button type="button" variant="secondary" size="sm" className="w-full" onClick={clearFilters}>
                Xóa bộ lọc
              </Button>
            </form>

            <div>
              <h3 className="text-sm font-medium text-zinc-900">Danh mục</h3>
              <div className="mt-3 flex flex-wrap gap-2">
                {categories.length === 0 ? (
                  <p className="text-sm text-zinc-500">Chưa có danh mục.</p>
                ) : categories.map((item) => {
                  const categoryID = item.id || item.slug || item.category_name;
                  const isActive = currentCategory === categoryID;
                  return (
                    <Button
                      key={categoryID}
                      onClick={() => router.push(buildHref({ category: isActive ? undefined : categoryID, page: undefined }))}
                      variant={isActive ? 'primary' : 'outline'}
                      size="sm"
                    >
                      {item.category_name}
                    </Button>
                  );
                })}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium text-zinc-900">Tác giả</h3>
              <div className="mt-3">
                {currentAuthor ? (
                  <Button size="sm" variant="primary" onClick={() => router.push(buildHref({ author: undefined, page: undefined }))}>
                    {currentAuthor}
                  </Button>
                ) : (
                  <p className="text-sm text-zinc-500">Chọn tác giả từ trang tác giả hoặc tìm kiếm.</p>
                )}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium text-zinc-900">Khoảng giá</h3>
              <div className="mt-3 flex flex-wrap gap-2">
                {priceRanges.map((range) => {
                  const isActive = currentMinPrice === range.min && currentMaxPrice === range.max;
                  return (
                    <Button
                      key={range.label}
                      size="sm"
                      variant={isActive ? 'primary' : 'outline'}
                      onClick={() => {
                        setMinPriceInput(isActive ? '' : range.min ?? '');
                        setMaxPriceInput(isActive ? '' : range.max ?? '');
                        router.push(buildHref({
                          min_price: isActive ? undefined : range.min,
                          max_price: isActive ? undefined : range.max,
                          page: undefined,
                        }));
                      }}
                    >
                      {range.label}
                    </Button>
                  );
                })}
              </div>
            </div>
          </div>
        </aside>

        <div>
          {!loading && !error ? (
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3 text-sm text-graphite">
              <p>
                Đang hiển thị <span className="font-medium text-charcoal">{books.length}</span> trong tổng số{' '}
                <span className="font-medium text-charcoal">{total}</span> đầu sách.
              </p>
              <p className="text-ash">Giá hiển thị theo VND khi backend trả về dữ liệu hợp lệ.</p>
            </div>
          ) : null}

          {loading ? (
            <LoadingState />
          ) : error ? (
            <ErrorState message={error} />
          ) : books.length === 0 ? (
            <CommerceState title="Không tìm thấy sách phù hợp" message="Thử bỏ bớt bộ lọc hoặc tìm bằng từ khóa khác." />
          ) : (
            <ProductGrid>
              {books.map((book) => (
                <BookCard key={`${book.id}`} book={book} compact href={`/books/${book.id}`} />
              ))}
            </ProductGrid>
          )}

          {!loading && !error && totalPages > 1 ? (
            <div className="mt-10 flex flex-wrap items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={safePage <= 1}
                onClick={() => router.push(buildHref({ page: String(Math.max(1, safePage - 1)) }))}
              >
                Truoc
              </Button>
              {visiblePages.map((item, index) => (
                item === 'ellipsis' ? (
                  <span key={`ellipsis-${index}`} className="px-2 text-sm text-ash">...</span>
                ) : (
                  <Button
                    key={item}
                    variant={item === safePage ? 'primary' : 'outline'}
                    size="icon"
                    onClick={() => router.push(buildHref({ page: String(item) }))}
                  >
                    {item}
                  </Button>
                )
              ))}
              <Button
                variant="outline"
                size="sm"
                disabled={safePage >= totalPages}
                onClick={() => router.push(buildHref({ page: String(Math.min(totalPages, safePage + 1)) }))}
              >
                Sau
              </Button>
            </div>
          ) : null}
        </div>
      </div>
    </CommerceSection>
  );
}
