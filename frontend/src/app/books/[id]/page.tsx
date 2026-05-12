'use client';

import { ArrowLeft, ShoppingCart } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { RouteShell } from '@/components/layout/RouteShell';
import { Button } from '@/components/ui/button';
import { booksApi } from '@/lib/api/books';
import { cartApi } from '@/lib/api/cart';
import { categoriesApi } from '@/lib/api/categories';
import { ordersApi } from '@/lib/api/orders';
import { recommendationsApi } from '@/lib/api/recommendations';
import { toFeaturedBook } from '@/lib/books';
import type { BookDetail, SimilarBook } from '@/lib/types';
import { useCartStore } from '@/stores/cart.store';
import { useAuthStore } from '@/stores/auth.store';
import { toast } from 'sonner';

function formatPrice(value?: number) {
  if (typeof value !== 'number') return 'Liên hệ';
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(value);
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
  const user = useAuthStore((s) => s.user);
  const setCart = useCartStore((s) => s.setCart);
  const setCheckoutItems = useCartStore((s) => s.setCheckoutItems);

  const handleBuyNow = async () => {
    if (!book) return;
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
          price: book.price ?? book.pricing?.price ?? 0,
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
        const [detail, recommendations] = await Promise.allSettled([
          booksApi.getDetail(id),
          recommendationsApi.similarBooks(id),
        ]);

        if (!mounted) return;

        if (detail.status === 'fulfilled') {
          setBook(detail.value);
          setCategoryLabel(detail.value.category?.category_id || 'Sách');

          categoriesApi.list({ page: 1, page_size: 100 }).then((res) => {
            if (!mounted) return;
            const categories = Array.isArray((res as any).data) ? (res as any).data : [];
            const match = categories.find((category: any) => category.id === detail.value.category?.category_id);
            if (match?.category_name) setCategoryLabel(match.category_name);
          }).catch(() => undefined);
        } else {
          throw detail.reason;
        }

        if (recommendations.status === 'fulfilled') {
          const data = recommendations.value?.data ?? recommendations.value;
          setRelatedBooks(Array.isArray(data?.similar_books) ? data.similar_books : []);
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
  }, [id]);

  useEffect(() => {
    if (!id || !user) return;
    booksApi.recordView(id).catch(() => undefined);
  }, [id, user]);

  const featured = book ? toFeaturedBook(book, 0) : null;
  const categoryName = categoryLabel || book?.category?.category_id || 'Sách';
  const price = formatPrice(book?.price ?? book?.pricing?.price);
  const authors = book?.authors?.map((author) => author.author_name).filter(Boolean).join(', ');
  const tags = book?.tags?.map((tag) => tag.tag_name).filter(Boolean) ?? [];
  const primaryImage = book?.images?.find((image) => image.is_primary)?.url || book?.images?.[0]?.url;
  const createdAt = book?.created_at ? new Date(book.created_at).toLocaleDateString() : '';

  return (
    <RouteShell title={featured?.title ?? 'Chi tiết sách'} subtitle={book?.short_description ?? 'Xem thông tin sách, tình trạng kho và gợi ý liên quan.'}>
      <section className="mx-auto max-w-page px-6 pb-16 pt-0 lg:px-10 xl:px-24">
        <Link href="/books" className="inline-flex items-center gap-2 text-[14px] font-medium tracking-[-0.18px] text-graphite transition hover:text-charcoal">
          <ArrowLeft className="h-4 w-4" />
          Quay lại kho sách
        </Link>

        {loading ? (
          <div className="mt-8 rounded-cards-lg border border-stone-surface bg-white p-6 text-sm text-graphite" style={{ boxShadow: 'var(--shadow-sm)' }}>
            Đang tải chi tiết sách...
          </div>
        ) : error ? (
          <div className="mt-8 rounded-cards-lg border border-coral-red/20 bg-coral-red/5 p-6 text-coral-red" style={{ boxShadow: 'var(--shadow-sm)' }}>
            <p className="font-medium">Không tải được chi tiết sách</p>
            <p className="mt-2 text-sm text-graphite">{error}</p>
          </div>
        ) : book ? (
          <>
            <div className="mt-6 grid gap-8 lg:grid-cols-[0.85fr_1.15fr]">
              <div className="rounded-cards-lg bg-white p-5" style={{ boxShadow: 'var(--shadow-sm)' }}>
                <div className="relative flex min-h-[520px] items-center justify-center overflow-hidden rounded-cards bg-stone-surface/20 p-8">
                  {primaryImage ? (
                    <Image
                      src={primaryImage}
                      alt={book.images?.[0]?.alt || book.name}
                      width={360}
                      height={520}
                      unoptimized
                      className="max-h-[520px] w-auto object-contain rounded-cards shadow-2xl"
                    />
                  ) : (
                    <div className="mb-4 flex h-[420px] w-[280px] items-center justify-center rounded-cards border border-stone-surface bg-parchment text-sm font-medium text-graphite/50 shadow-2xl">
                      Chưa có ảnh bìa
                    </div>
                  )}
                </div>
                {book.images?.length > 1 ? (
                  <div className="mt-4 grid grid-cols-4 gap-3">
                    {book.images.slice(0, 4).map((image, index) => (
                      <div key={`${image.url}-${index}`} className="relative h-20 overflow-hidden rounded-tags border border-stone-surface bg-parchment">
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

              <div className="space-y-6 lg:sticky lg:top-32 lg:self-start">
                <div className="space-y-3">
                  <div className="inline-flex items-center gap-2 rounded-pill border border-deep-amber/20 bg-sunburst/10 px-4 py-2 text-[12px] font-medium uppercase tracking-[0.16em] text-deep-amber">
                    {categoryName}
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-[14px] text-graphite">
                    {authors ? <span>Tác giả {authors}</span> : null}
                    <span className={book.stock_quantity > 0 ? 'text-meadow' : 'text-coral-red'}>
                      {book.stock_quantity > 0 ? `Còn ${book.stock_quantity} trong kho` : 'Hết hàng'}
                    </span>
                  </div>
                </div>

                <div className="rounded-cards-lg border border-ember/20 bg-white p-5" style={{ boxShadow: 'var(--shadow-sm)' }}>
                  <p className="text-[13px] font-medium uppercase tracking-[0.18em] text-ash">Giá bán</p>
                  <p className="mt-2 text-[34px] font-semibold leading-none text-ember">{price}</p>
                  <div className="mt-4 grid gap-2 text-sm text-graphite sm:grid-cols-3">
                    <span className="rounded-cards bg-parchment px-3 py-2 font-medium">Freeship từ 149K</span>
                    <span className="rounded-cards bg-parchment px-3 py-2 font-medium">Đổi trả 30 ngày</span>
                    <span className="rounded-cards bg-parchment px-3 py-2 font-medium">Đóng gói cẩn thận</span>
                  </div>
                </div>

                <p className="max-w-[560px] text-[17px] leading-[1.47] tracking-[-0.22px] text-graphite">
                  {book.detail_description || book.short_description || 'Thông tin sách được đồng bộ từ dữ liệu backend.'}
                </p>

                <div className="flex flex-wrap items-center gap-4">
                  <Button onClick={handleAddToCart} disabled={addingToCart}>
                    <ShoppingCart className="mr-2 h-4 w-4" />
                    {addingToCart ? 'Đang thêm...' : 'Thêm vào giỏ'}
                  </Button>
                  <Button variant="outline" onClick={handleBuyNow} disabled={buyingNow}>
                    {buyingNow ? 'Đang tạo đơn...' : 'Mua ngay'}
                  </Button>
                </div>

                <div className="grid gap-3 rounded-cards-lg border border-stone-surface bg-white p-5 text-sm text-graphite" style={{ boxShadow: 'var(--shadow-sm)' }}>
                  <div className="flex justify-between gap-4"><span>Trạng thái</span><span className="font-medium capitalize text-charcoal">{book.product_status || 'Chưa rõ'}</span></div>
                  {book.series?.series_name ? (
                    <div className="flex justify-between gap-4"><span>Bộ sách</span><span className="text-right font-medium text-charcoal">{book.series.series_name}{book.series.sequence_no ? ` #${book.series.sequence_no}` : ''}</span></div>
                  ) : null}
                  {createdAt ? <div className="flex justify-between gap-4"><span>Ngày thêm</span><span className="font-medium text-charcoal">{createdAt}</span></div> : null}
                  <div className="flex justify-between gap-4"><span>Mã sách</span><span className="max-w-[220px] truncate font-mono text-xs text-charcoal">{book.id}</span></div>
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
                <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
                  {relatedBooks.map((related) => (
                    <Link key={related.book_id} href={`/books/${related.book_id}`} className="rounded-cards bg-white p-4 transition duration-200 hover:shadow-card-hover" style={{ boxShadow: 'var(--shadow-subtle)' }}>
                      <div
                        className="h-40 rounded-tags bg-gradient-to-br from-parchment to-stone-surface bg-cover bg-center"
                        style={related.cover_url ? { backgroundImage: `url(${related.cover_url})` } : undefined}
                      />
                      <p className="mt-3 text-[11px] font-medium uppercase tracking-[0.14em] text-ash">Gợi ý</p>
                      <h3 className="mt-1 text-[17px] font-medium tracking-[-0.22px] text-charcoal">{related.title}</h3>
                      <p className="mt-1 text-[15px] text-graphite">Độ phù hợp {related.score}</p>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : null}
      </section>
    </RouteShell>
  );
}
