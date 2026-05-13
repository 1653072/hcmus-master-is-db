'use client';

import { ArrowLeft, RefreshCw, ShoppingCart } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { RouteShell } from '@/components/layout/RouteShell';
import { BookCard, type FeaturedBook } from '@/components/books/book-card';
import { Button } from '@/components/ui/button';
import { ProductGrid } from '@/components/ui/commerce';
import { booksApi } from '@/lib/api/books';
import { cartApi } from '@/lib/api/cart';
import { categoriesApi } from '@/lib/api/categories';
import { ordersApi } from '@/lib/api/orders';
import { recommendationsApi } from '@/lib/api/recommendations';
import { toFeaturedBook } from '@/lib/books';
import type { BookDetail, SimilarBook } from '@/lib/types';
import { formatCurrency, normalizeCurrencyAmount } from '@/lib/utils';
import { useCartStore } from '@/stores/cart.store';
import { useAuthStore } from '@/stores/auth.store';
import { toast } from 'sonner';

function normalizePrice(value?: number) {
  return normalizeCurrencyAmount(value);
}

function formatPrice(value?: number) {
  return formatCurrency(value);
}

function formatDate(value?: string) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

function formatStatus(status?: string, stockQuantity = 0) {
  if (stockQuantity <= 0) return 'Hết hàng';
  const normalized = status?.trim().toLowerCase();
  const labels: Record<string, string> = {
    active: 'Đang bán',
    available: 'Đang bán',
    published: 'Đang bán',
    on_sale: 'Đang bán',
    inactive: 'Ngừng bán',
    draft: 'Chưa mở bán',
    archived: 'Ngừng bán',
    discontinued: 'Ngừng bán',
    out_of_stock: 'Hết hàng',
  };
  return normalized ? labels[normalized] ?? 'Đang cập nhật' : 'Đang cập nhật';
}

function formatCategoryName(value?: string) {
  const label = value?.trim();
  if (!label) return 'Sách';
  const categoryLabels: Record<string, string> = {
    adventure: 'Phiêu lưu',
    biography: 'Tiểu sử',
    business: 'Kinh doanh',
    children: 'Thiếu nhi',
    comics: 'Truyện tranh',
    education: 'Giáo dục',
    fantasy: 'Kỳ ảo',
    health: 'Sức khỏe',
    history: 'Lịch sử',
    horror: 'Kinh dị',
    literature: 'Văn học',
    mystery: 'Trinh thám',
    romance: 'Lãng mạn',
    'science fiction': 'Khoa học viễn tưởng',
    'self help': 'Kỹ năng sống',
    'self-help': 'Kỹ năng sống',
    technology: 'Công nghệ',
  };
  return categoryLabels[label.toLowerCase()] ?? label;
}

function canPurchaseBook(book: BookDetail) {
  const status = book.product_status?.trim().toLowerCase();
  const blockedStatuses = new Set(['inactive', 'draft', 'archived', 'discontinued', 'out_of_stock']);
  return book.stock_quantity > 0 && !blockedStatuses.has(status ?? '') && typeof normalizePrice(book.price ?? book.pricing?.price) === 'number';
}

function shortBookCode(id?: string) {
  if (!id) return 'Đang cập nhật';
  return id.length > 10 ? id.slice(-8).toUpperCase() : id.toUpperCase();
}

function toRelatedBookCard(book: SimilarBook, index: number): FeaturedBook {
  return toFeaturedBook({
    ...book,
    id: book.book_id,
    name: book.title,
    image: book.cover_url,
  }, index);
}

function BookDetailSkeleton() {
  return (
    <>
      <div className="mt-6 grid gap-8 lg:grid-cols-[0.85fr_1.15fr]">
        <div className="order-2 rounded-cards-lg bg-white p-5 lg:order-1" style={{ boxShadow: 'var(--shadow-sm)' }}>
          <div className="flex min-h-[420px] items-center justify-center rounded-cards bg-stone-surface/20 p-8 sm:min-h-[520px]">
            <div className="skeleton-shimmer h-[340px] w-[230px] rounded-cards bg-parchment shadow-subtle sm:h-[420px] sm:w-[280px]" />
          </div>
        </div>

        <div className="order-1 space-y-6 lg:order-2">
          <div className="space-y-3">
            <div className="skeleton-shimmer h-9 w-44 rounded-pill bg-parchment" />
            <div className="flex gap-3">
              <div className="skeleton-shimmer h-4 w-36 rounded-full bg-stone-surface" />
              <div className="skeleton-shimmer h-4 w-28 rounded-full bg-stone-surface" />
            </div>
          </div>

          <div className="rounded-cards-lg border border-stone-surface bg-white p-5" style={{ boxShadow: 'var(--shadow-sm)' }}>
            <div className="skeleton-shimmer h-3 w-20 rounded-full bg-stone-surface" />
            <div className="skeleton-shimmer mt-3 h-9 w-36 rounded-full bg-parchment" />
            <div className="mt-5 grid gap-2 sm:grid-cols-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="skeleton-shimmer h-10 rounded-cards bg-parchment" />
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <div className="skeleton-shimmer h-4 w-full rounded-full bg-stone-surface" />
            <div className="skeleton-shimmer h-4 w-11/12 rounded-full bg-stone-surface" />
            <div className="skeleton-shimmer h-4 w-4/5 rounded-full bg-stone-surface" />
          </div>

          <div className="flex gap-4">
            <div className="skeleton-shimmer h-11 w-36 rounded-buttons bg-ember/20" />
            <div className="skeleton-shimmer h-11 w-28 rounded-buttons bg-stone-surface" />
          </div>
        </div>
      </div>

      <div className="mt-16 grid gap-6 lg:grid-cols-[1fr_0.9fr]">
        <div className="rounded-cards-lg bg-white p-8" style={{ boxShadow: 'var(--shadow-subtle)' }}>
          <div className="skeleton-shimmer h-8 w-40 rounded-full bg-stone-surface" />
          <div className="mt-6 space-y-3">
            <div className="skeleton-shimmer h-4 w-full rounded-full bg-stone-surface" />
            <div className="skeleton-shimmer h-4 w-11/12 rounded-full bg-stone-surface" />
            <div className="skeleton-shimmer h-4 w-4/5 rounded-full bg-stone-surface" />
          </div>
        </div>
        <div className="rounded-cards-lg bg-parchment p-8" style={{ boxShadow: 'var(--shadow-subtle)' }}>
          <div className="skeleton-shimmer h-8 w-52 rounded-full bg-stone-surface" />
          <div className="mt-6 space-y-4">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="skeleton-shimmer h-4 rounded-full bg-stone-surface" />
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

export default function Page() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const [book, setBook] = useState<BookDetail | null>(null);
  const [categoryLabel, setCategoryLabel] = useState('');
  const [relatedBooks, setRelatedBooks] = useState<SimilarBook[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addingToCart, setAddingToCart] = useState(false);
  const [buyingNow, setBuyingNow] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const user = useAuthStore((s) => s.user);
  const setCart = useCartStore((s) => s.setCart);
  const setCheckoutItems = useCartStore((s) => s.setCheckoutItems);

  const handleBuyNow = async () => {
    if (!book) return;
    if (!canPurchaseBook(book)) {
      toast.error('Sách hiện chưa thể mua. Vui lòng chọn sách khác hoặc quay lại sau.');
      return;
    }
    if (!user) {
      toast.error('Vui lòng đăng nhập để mua sách.');
      return;
    }

    try {
      setBuyingNow(true);
      const session = await ordersApi.buyNow({ book_id: book.id, quantity: 1 });
      setCheckoutItems([
        {
          book_id: book.id,
          name: book.name,
          price: normalizePrice(book.price ?? book.pricing?.price) ?? 0,
          quantity: 1,
        },
      ], session.session_id);
      router.push('/checkout');
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Không thể bắt đầu thanh toán');
    } finally {
      setBuyingNow(false);
    }
  };

  const handleAddToCart = async () => {
    if (!book) return;
    if (!canPurchaseBook(book)) {
      toast.error('Sách hiện chưa thể thêm vào giỏ.');
      return;
    }
    if (!user) {
      toast.error('Vui lòng đăng nhập để thêm sách vào giỏ.');
      return;
    }
    
    try {
      setAddingToCart(true);
      await cartApi.add({ book_id: book.id, quantity: 1 });
      const currentCart = await cartApi.get();
      if (currentCart && currentCart.items) {
        setCart(currentCart.items, currentCart.total_price || 0);
        toast.success(`Đã thêm ${book.name} vào giỏ hàng`);
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Không thể thêm vào giỏ hàng');
    } finally {
      setAddingToCart(false);
    }
  };

  useEffect(() => {
    if (!id) return;
    let mounted = true;

    async function loadDetail() {
      try {
        setLoading(true);
        setError(null);
        setBook(null);
        setRelatedBooks([]);
        setCategoryLabel('');
        const [detail, recommendations] = await Promise.allSettled([
          booksApi.getDetail(id),
          recommendationsApi.similarBooks(id),
        ]);

        if (!mounted) return;

        if (detail.status === 'fulfilled') {
          setBook(detail.value);

          categoriesApi.list({ page: 1, page_size: 1000 }).then((res) => {
            if (!mounted) return;
            const categories = Array.isArray((res as any).data) ? (res as any).data : [];
            const match = categories.find((category: any) => category.id === detail.value.category?.category_id);
            if (match?.category_name) setCategoryLabel(match.category_name);
          }).catch(() => undefined);
        } else {
          throw detail.reason;
        }

        if (recommendations.status === 'fulfilled') {
          setRelatedBooks(Array.isArray(recommendations.value) ? recommendations.value : []);
        }
      } catch (err) {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : 'Không tải được chi tiết sách');
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadDetail();
    return () => {
      mounted = false;
    };
  }, [id, loadAttempt]);

  useEffect(() => {
    if (!id || !user) return;
    booksApi.recordView(id).catch(() => undefined);
  }, [id, user]);

  const featured = book ? toFeaturedBook(book, 0) : null;
  const pageTitle = featured?.title ?? 'Chi tiết sách';
  const categoryName = formatCategoryName(categoryLabel);
  const price = formatPrice(book?.price ?? book?.pricing?.price);
  const authors = book?.authors?.map((author) => author.author_name).filter(Boolean).join(', ');
  const tags = book?.tags?.map((tag) => tag.tag_name).filter(Boolean) ?? [];
  const primaryImage = book?.images?.find((image) => image.is_primary)?.url || book?.images?.[0]?.url;
  const createdAt = formatDate(book?.created_at);
  const statusLabel = book ? formatStatus(book.product_status, book.stock_quantity) : '';
  const canPurchase = book ? canPurchaseBook(book) : false;
  const unavailableReason = book && !canPurchase
    ? book.stock_quantity <= 0
      ? 'Sách đang hết hàng, các nút mua đã được tạm khóa.'
      : price === 'Liên hệ'
        ? 'Sách chưa có giá bán công khai. Vui lòng quay lại sau.'
        : 'Sách hiện chưa mở bán trực tuyến.'
    : '';
  const purchaseBlockedLabel = book?.stock_quantity === 0 ? 'Tạm hết hàng' : 'Chưa mở bán';

  return (
    <RouteShell
      breadcrumbLabels={{
        ...(id ? { [id]: pageTitle, [`/books/${id}`]: pageTitle } : {}),
      }}
    >
      <section className="mx-auto max-w-page px-6 pb-16 pt-6 lg:px-10 xl:px-24">
        <Link href="/books" className="inline-flex items-center gap-2 text-[14px] font-medium text-graphite transition hover:text-charcoal">
          <ArrowLeft className="h-4 w-4" />
          Quay lại kho sách
        </Link>

        {loading ? (
          <BookDetailSkeleton />
        ) : error ? (
          <div className="mt-8 rounded-cards-lg border border-coral-red/20 bg-coral-red/5 p-6 text-coral-red" style={{ boxShadow: 'var(--shadow-sm)' }}>
            <p className="font-medium">Không tải được chi tiết sách</p>
            <p className="mt-2 text-sm text-graphite">{error}</p>
            <Button variant="outline" className="mt-5 bg-white" onClick={() => setLoadAttempt((current) => current + 1)}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Tải lại
            </Button>
          </div>
        ) : book ? (
          <>
            <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(360px,0.92fr)_minmax(0,1.08fr)] xl:grid-cols-[500px_minmax(0,1fr)]">
              <div className="rounded-cards-lg border border-stone-surface bg-white p-4 shadow-card-hover lg:sticky lg:top-36 lg:self-start">
                <div className="relative flex aspect-[4/5] min-h-[360px] items-center justify-center overflow-hidden rounded-cards bg-parchment p-6 sm:min-h-[460px]">
                  {primaryImage ? (
                    <Image
                      src={primaryImage}
                      alt={book.images?.[0]?.alt || book.name}
                      width={360}
                      height={520}
                      unoptimized
                      className="max-h-full w-auto rounded-cards object-contain shadow-card-lg"
                    />
                  ) : (
                    <div className="flex h-[320px] w-[220px] items-center justify-center rounded-cards border border-stone-surface bg-white text-center text-sm font-medium text-graphite/50 shadow-subtle sm:h-[400px] sm:w-[270px]">
                      Chưa có ảnh bìa
                    </div>
                  )}
                </div>
                {book.images?.length > 1 ? (
                  <div className="mt-3 grid grid-cols-4 gap-3">
                    {book.images.slice(0, 4).map((image, index) => (
                      <div key={`${image.url}-${index}`} className="relative aspect-[3/4] overflow-hidden rounded-tags border border-stone-surface bg-parchment">
                        <Image
                          src={image.url}
                          alt={image.alt || `${book.name} image ${index + 1}`}
                          fill
                          sizes="96px"
                          unoptimized
                          className="object-cover"
                        />
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>

              <div className="space-y-6">
                <div className="space-y-3">
                  <div className="inline-flex items-center gap-2 rounded-pill border border-stone-surface bg-parchment px-3 py-1.5 text-[12px] font-medium uppercase tracking-[0.14em] text-graphite">
                    {categoryName}
                  </div>
                  <h1 className="max-w-[760px] text-[34px] font-semibold leading-[1.08] text-charcoal md:text-[44px]">
                    {pageTitle}
                  </h1>
                  <div className="flex flex-wrap items-center gap-3 text-[14px] text-graphite">
                    {authors ? <span>Tác giả {authors}</span> : null}
                    <span className={book.stock_quantity > 0 ? 'text-meadow' : 'text-coral-red'}>
                      {book.stock_quantity > 0 ? `Còn ${book.stock_quantity} trong kho` : 'Hết hàng'}
                    </span>
                  </div>
                  {book.short_description ? (
                    <p className="max-w-[680px] text-[16px] leading-7 text-graphite">
                      {book.short_description}
                    </p>
                  ) : null}
                </div>

                <div className="rounded-cards-lg border border-stone-surface bg-white p-5 shadow-card-hover">
                  <p className="text-[13px] font-medium uppercase tracking-[0.18em] text-ash">Giá bán</p>
                  <p className="mt-2 text-[34px] font-semibold leading-none text-charcoal">{price}</p>
                  <div className="mt-4 grid gap-2 text-sm text-graphite sm:grid-cols-3">
                    <span className="rounded-cards bg-parchment px-3 py-2 font-medium">Freeship từ 149K</span>
                    <span className="rounded-cards bg-parchment px-3 py-2 font-medium">Đổi trả 30 ngày</span>
                    <span className="rounded-cards bg-parchment px-3 py-2 font-medium">Đóng gói cẩn thận</span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-4">
                  <Button size="lg" onClick={handleAddToCart} disabled={addingToCart || !canPurchase}>
                    <ShoppingCart className="mr-2 h-4 w-4" />
                    {addingToCart ? 'Đang thêm...' : canPurchase ? 'Thêm vào giỏ' : purchaseBlockedLabel}
                  </Button>
                  <Button size="lg" variant="outline" onClick={handleBuyNow} disabled={buyingNow || !canPurchase}>
                    {buyingNow ? 'Đang tạo đơn...' : 'Mua ngay'}
                  </Button>
                </div>
                {unavailableReason ? (
                  <p className="rounded-cards border border-coral-red/20 bg-coral-red/5 px-4 py-3 text-sm font-medium text-coral-red">
                    {unavailableReason}
                  </p>
                ) : null}

                <div className="grid gap-3 rounded-cards-lg border border-stone-surface bg-white p-5 text-sm text-graphite shadow-card-hover">
                  <div className="flex justify-between gap-4"><span>Trạng thái</span><span className="font-medium text-charcoal">{statusLabel}</span></div>
                  {authors ? (
                    <div className="flex justify-between gap-4"><span>Tác giả</span><span className="text-right font-medium text-charcoal">{authors}</span></div>
                  ) : null}
                  {book.publisher ? (
                    <div className="flex justify-between gap-4"><span>Nhà xuất bản</span><span className="text-right font-medium text-charcoal">{book.publisher}</span></div>
                  ) : null}
                  {book.publish_year ? (
                    <div className="flex justify-between gap-4"><span>Năm xuất bản</span><span className="font-medium text-charcoal">{book.publish_year}</span></div>
                  ) : null}
                  {book.series?.series_name ? (
                    <div className="flex justify-between gap-4"><span>Bộ sách</span><span className="text-right font-medium text-charcoal">{book.series.series_name}{book.series.sequence_no ? ` #${book.series.sequence_no}` : ''}</span></div>
                  ) : null}
                  {createdAt ? <div className="flex justify-between gap-4"><span>Ngày thêm</span><span className="font-medium text-charcoal">{createdAt}</span></div> : null}
                  <div className="flex justify-between gap-4"><span>Mã tham chiếu</span><span className="font-mono text-xs font-medium text-charcoal">{shortBookCode(book.id)}</span></div>
                </div>
              </div>
            </div>

            <div className="mt-16 grid gap-6 lg:grid-cols-[1fr_0.9fr]">
              <div className="rounded-cards-lg bg-white p-8" style={{ boxShadow: 'var(--shadow-subtle)' }}>
                <h2 className="text-[28px] font-semibold text-midnight">Mô tả sách</h2>
                {book.short_description ? (
                  <p className="mt-4 text-[16px] font-medium leading-7 tracking-[-0.2px] text-charcoal">{book.short_description}</p>
                ) : null}
                <p className="mt-4 text-[15px] leading-[1.47] tracking-[-0.2px] text-graphite">
                  {book.detail_description || book.short_description || 'Chưa có mô tả.'}
                </p>
                {tags.length > 0 ? (
                  <div className="mt-6 flex flex-wrap gap-2">
                    {tags.map((tag) => (
                      <span key={tag} className="rounded-full border border-stone-surface bg-parchment px-3 py-1 text-xs font-medium text-graphite">
                        {tag}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>

              <div className="rounded-cards-lg bg-parchment p-8" style={{ boxShadow: 'var(--shadow-subtle)' }}>
                <h2 className="text-[28px] font-semibold text-midnight">Thông tin bán hàng</h2>
                <div className="mt-5 space-y-3 text-[15px] tracking-[-0.2px] text-graphite">
                  <div className="flex items-center justify-between font-medium text-charcoal"><span>Giá niêm yết</span><span>{price}</span></div>
                  <div className="flex items-center justify-between font-medium text-charcoal"><span>Tồn kho</span><span>{book.stock_quantity}</span></div>
                  <div className="flex items-center justify-between font-medium text-charcoal"><span>Danh mục</span><span className="text-right">{categoryName}</span></div>
                  <div className="flex items-center justify-between font-medium text-charcoal"><span>Trạng thái</span><span className="text-right">{statusLabel}</span></div>
                  <p className="border-t border-stone-surface pt-3 text-sm text-graphite">Phí vận chuyển và ưu đãi được tính ở bước thanh toán.</p>
                </div>
              </div>
            </div>

            <div className="mt-16">
              <div className="mb-8">
                <h2 className="text-[32px] font-semibold text-midnight">Sách liên quan</h2>
              </div>
              {relatedBooks.length === 0 ? (
                <div className="rounded-cards-lg border border-dashed border-stone-surface bg-parchment p-12 text-center text-sm text-graphite">
                  Chưa có sách liên quan.
                </div>
              ) : (
                <ProductGrid>
                  {relatedBooks.map((related, index) => (
                    <BookCard key={related.book_id} book={toRelatedBookCard(related, index)} compact href={`/books/${related.book_id}`} />
                  ))}
                </ProductGrid>
              )}
            </div>
          </>
        ) : null}
      </section>
    </RouteShell>
  );
}
