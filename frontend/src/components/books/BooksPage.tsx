import { ChevronDown } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState, type FormEvent } from 'react';

import { BookCard, type FeaturedBook } from '@/components/books/book-card';
import { Button } from '@/components/ui/button';
import { CommerceSection, CommerceSkeletonGrid, CommerceState, ProductGrid } from '@/components/ui/commerce';

interface BooksPageProps {
  books: FeaturedBook[];
  loading?: boolean;
  error?: string | null;
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

const PRICE_MIN = 0;
const PRICE_MAX = 500000;
const PRICE_STEP = 1000;
const PRICE_MIN_GAP = 1000;

function parsePriceValue(value: string, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function clampPriceValue(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function formatSliderPrice(value: number) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(value);
}

function sanitizePriceInput(value: string) {
  if (!value.trim()) return '';
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return '';
  return String(Math.floor(parsed));
}

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
  loading = false,
  error = null,
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

  const normalizePriceInputs = () => {
    const nextMin = sanitizePriceInput(minPriceInput);
    const nextMax = sanitizePriceInput(maxPriceInput);

    if (nextMin && nextMax && Number(nextMin) > Number(nextMax)) {
      setMinPriceInput(nextMax);
      setMaxPriceInput(nextMin);
      return;
    }

    setMinPriceInput(nextMin);
    setMaxPriceInput(nextMax);
  };

  const applyAdvancedFilters = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextMinPrice = sanitizePriceInput(minPriceInput);
    const nextMaxPrice = sanitizePriceInput(maxPriceInput);
    const minNumber = Number(nextMinPrice);
    const maxNumber = Number(nextMaxPrice);
    const hasMinPrice = nextMinPrice !== '';
    const hasMaxPrice = nextMaxPrice !== '';
    const sortedMinPrice = hasMinPrice && hasMaxPrice && minNumber > maxNumber ? nextMaxPrice : nextMinPrice;
    const sortedMaxPrice = hasMinPrice && hasMaxPrice && minNumber > maxNumber ? nextMinPrice : nextMaxPrice;

    router.push(buildHref({
      search: queryInput.trim() || undefined,
      author: authorInput.trim() || undefined,
      publisher: publisherInput.trim() || undefined,
      year: yearInput.trim() || undefined,
      min_price: sortedMinPrice || undefined,
      max_price: sortedMaxPrice || undefined,
      page: undefined,
    }));
  };

  const clearFilters = () => router.push('/books');

  const totalPages = Math.max(1, Math.ceil(total / safePageSize));
  const visiblePages = paginationItems(Math.min(safePage, totalPages), totalPages);
  const rawMinPriceValue = clampPriceValue(parsePriceValue(minPriceInput, PRICE_MIN), PRICE_MIN, PRICE_MAX - PRICE_MIN_GAP);
  const rawMaxPriceValue = clampPriceValue(parsePriceValue(maxPriceInput, PRICE_MAX), PRICE_MIN + PRICE_MIN_GAP, PRICE_MAX);
  const minPriceValue = Math.min(rawMinPriceValue, rawMaxPriceValue - PRICE_MIN_GAP);
  const maxPriceValue = Math.max(rawMaxPriceValue, minPriceValue + PRICE_MIN_GAP);
  const minPricePercent = ((minPriceValue - PRICE_MIN) / (PRICE_MAX - PRICE_MIN)) * 100;
  const maxPricePercent = ((maxPriceValue - PRICE_MIN) / (PRICE_MAX - PRICE_MIN)) * 100;
  const minPriceLabel = minPriceInput ? formatSliderPrice(parsePriceValue(minPriceInput, PRICE_MIN)) : formatSliderPrice(PRICE_MIN);
  const maxPriceLabel = maxPriceInput ? formatSliderPrice(parsePriceValue(maxPriceInput, PRICE_MAX)) : 'Không giới hạn';
  const activeFilterCount = [
    currentQuery,
    currentAuthor,
    currentPublisher,
    currentYear,
    currentMinPrice || currentMaxPrice ? 'price' : undefined,
  ].filter(Boolean).length;
  const hasAdvancedFilters = Boolean(currentAuthor || currentPublisher || currentYear || currentMinPrice || currentMaxPrice);

  return (
    <CommerceSection className="pb-16 pt-4">
      <div className="grid gap-8 lg:grid-cols-[280px_minmax(0,1fr)] lg:items-start">
        <aside className="rounded-cards-lg border border-stone-surface bg-white p-4 shadow-card-hover lg:sticky lg:top-44">
          <div className="flex items-center justify-between gap-3 border-b border-stone-surface pb-3">
            <h2 className="text-[15px] font-semibold text-charcoal">Bộ lọc</h2>
            {activeFilterCount > 0 ? (
              <span className="rounded-pill bg-parchment px-2.5 py-1 text-xs font-medium text-graphite">
                {activeFilterCount}
              </span>
            ) : null}
          </div>

          <div className="mt-4 space-y-4">
            <form onSubmit={applyAdvancedFilters} className="space-y-3">
              <label className="block">
                <span className="text-[13px] font-medium text-charcoal">Từ khóa</span>
                <input
                  type="search"
                  value={queryInput}
                  onChange={(event) => setQueryInput(event.target.value)}
                  placeholder="Tên sách, mô tả, tag"
                  className="mt-2 h-9 w-full rounded-inputs border border-stone-surface bg-white px-3 text-sm text-charcoal outline-none transition focus:border-ember focus:ring-2 focus:ring-ember/15"
                />
              </label>

              <details
                open={hasAdvancedFilters || undefined}
                className="group rounded-cards border border-stone-surface bg-canvas"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2.5 text-[13px] font-semibold text-charcoal transition hover:text-ember focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember/25 [&::-webkit-details-marker]:hidden">
                  Tìm kiếm nâng cao
                  <ChevronDown
                    aria-hidden="true"
                    className="h-4 w-4 text-ash transition duration-200 group-open:rotate-180"
                    strokeWidth={2}
                  />
                </summary>
                <div className="space-y-3 border-t border-stone-surface p-3">
                  <label className="block">
                    <span className="text-[12px] font-medium text-charcoal">Tác giả</span>
                    <input
                      type="text"
                      value={authorInput}
                      onChange={(event) => setAuthorInput(event.target.value)}
                      placeholder="Ví dụ: Nam Cao"
                      className="mt-1.5 h-9 w-full rounded-inputs border border-stone-surface bg-white px-3 text-sm text-charcoal outline-none transition focus:border-ember focus:ring-2 focus:ring-ember/15"
                    />
                  </label>
                  <label className="block">
                    <span className="text-[12px] font-medium text-charcoal">Nhà xuất bản</span>
                    <input
                      type="text"
                      value={publisherInput}
                      onChange={(event) => setPublisherInput(event.target.value)}
                      placeholder="NXB hoặc publisher"
                      className="mt-1.5 h-9 w-full rounded-inputs border border-stone-surface bg-white px-3 text-sm text-charcoal outline-none transition focus:border-ember focus:ring-2 focus:ring-ember/15"
                    />
                  </label>
                  <div>
                    <label className="block">
                      <span className="text-[12px] font-medium text-charcoal">Năm</span>
                      <input
                        type="number"
                        min="0"
                        value={yearInput}
                        onChange={(event) => setYearInput(event.target.value)}
                        placeholder="2024"
                        className="mt-1.5 h-9 w-full rounded-inputs border border-stone-surface bg-white px-3 text-sm text-charcoal outline-none transition focus:border-ember focus:ring-2 focus:ring-ember/15"
                      />
                    </label>
                  </div>
                  <div className="rounded-cards border border-stone-surface bg-white p-3">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-[12px] font-medium text-charcoal">Khoảng giá</span>
                      <button
                        type="button"
                        onClick={() => {
                          setMinPriceInput('');
                          setMaxPriceInput('');
                        }}
                        className="text-[12px] font-medium text-ash transition hover:text-ember focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember/25"
                      >
                        Đặt lại
                      </button>
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-3 text-[12px] font-medium text-graphite">
                      <span>{minPriceLabel}</span>
                      <span>{maxPriceLabel}</span>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <label className="block">
                        <span className="text-[11px] font-medium text-ash">Từ</span>
                        <input
                          type="number"
                          min={PRICE_MIN}
                          step={PRICE_STEP}
                          inputMode="numeric"
                          value={minPriceInput}
                          onChange={(event) => setMinPriceInput(event.target.value)}
                          onBlur={normalizePriceInputs}
                          placeholder="0"
                          className="mt-1 h-9 w-full rounded-inputs border border-stone-surface bg-white px-2.5 text-sm text-charcoal outline-none transition focus:border-ember focus:ring-2 focus:ring-ember/15"
                        />
                      </label>
                      <label className="block">
                        <span className="text-[11px] font-medium text-ash">Đến</span>
                        <input
                          type="number"
                          min={PRICE_MIN}
                          step={PRICE_STEP}
                          inputMode="numeric"
                          value={maxPriceInput}
                          onChange={(event) => setMaxPriceInput(event.target.value)}
                          onBlur={normalizePriceInputs}
                          placeholder="Không giới hạn"
                          className="mt-1 h-9 w-full rounded-inputs border border-stone-surface bg-white px-2.5 text-sm text-charcoal outline-none transition focus:border-ember focus:ring-2 focus:ring-ember/15"
                        />
                      </label>
                    </div>
                    <div className="relative mt-3 h-8">
                      <div className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded-pill bg-stone-surface" />
                      <div
                        className="absolute top-1/2 h-1 -translate-y-1/2 rounded-pill bg-ember"
                        style={{ left: `${minPricePercent}%`, right: `${100 - maxPricePercent}%` }}
                      />
                      <input
                        type="range"
                        min={PRICE_MIN}
                        max={PRICE_MAX}
                        step={PRICE_STEP}
                        value={minPriceValue}
                        onChange={(event) => {
                          const nextValue = Math.min(Number(event.target.value), maxPriceValue - PRICE_MIN_GAP);
                          setMinPriceInput(nextValue <= PRICE_MIN ? '' : String(nextValue));
                        }}
                        aria-label="Giá từ"
                        className="pointer-events-none absolute inset-x-0 top-0 z-20 h-8 w-full appearance-none bg-transparent accent-ember [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-ember [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-ember [&::-webkit-slider-thumb]:shadow-subtle"
                      />
                      <input
                        type="range"
                        min={PRICE_MIN}
                        max={PRICE_MAX}
                        step={PRICE_STEP}
                        value={maxPriceValue}
                        onChange={(event) => {
                          const nextValue = Math.max(Number(event.target.value), minPriceValue + PRICE_MIN_GAP);
                          setMaxPriceInput(nextValue >= PRICE_MAX ? '' : String(nextValue));
                        }}
                        aria-label="Giá đến"
                        className="pointer-events-none absolute inset-x-0 top-0 z-30 h-8 w-full appearance-none bg-transparent accent-ember [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-ember [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-ember [&::-webkit-slider-thumb]:shadow-subtle"
                      />
                    </div>
                  </div>
                </div>
              </details>

              <div className="grid grid-cols-[1fr_auto] gap-2">
                <Button type="submit" size="sm" className="w-full">Áp dụng lọc</Button>
                <Button type="button" variant="secondary" size="sm" className="px-3" onClick={clearFilters}>
                  Xóa
                </Button>
              </div>
            </form>

          </div>
        </aside>

        <div>
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
                Trước
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
