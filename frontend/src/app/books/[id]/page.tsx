'use client';

import { ArrowLeft, Star, ShoppingCart } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { RouteShell } from '@/components/layout/RouteShell';
import { Button } from '@/components/ui/button';
import { booksApi } from '@/lib/api/books';
import { cartApi } from '@/lib/api/cart';
import { recommendationsApi } from '@/lib/api/recommendations';
import { toFeaturedBook } from '@/lib/books';
import type { BookDetail, SimilarBook } from '@/lib/types';
import { useCartStore } from '@/stores/cart.store';
import { useAuthStore } from '@/stores/auth.store';
import { toast } from 'sonner';

function formatPrice(value?: number) {
  if (typeof value !== 'number') return '$0';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
}

export default function Page() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const [book, setBook] = useState<BookDetail | null>(null);
  const [relatedBooks, setRelatedBooks] = useState<SimilarBook[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addingToCart, setAddingToCart] = useState(false);
  const user = useAuthStore((s) => s.user);
  const setCart = useCartStore((s) => s.setCart);
  const setCheckoutItems = useCartStore((s) => s.setCheckoutItems);

  const handleBuyNow = () => {
    if (!book) return;
    setCheckoutItems([{
      book_id: book.id,
      name: book.name,
      price: book.price ?? book.pricing?.price ?? 0,
      quantity: 1,
    }]);
    router.push('/checkout');
  };

  const handleAddToCart = async () => {
    if (!book) return;
    if (!user) {
      toast.error('Please sign in to add items to your cart.');
      return;
    }
    
    try {
      setAddingToCart(true);
      await cartApi.add({ book_id: book.id, quantity: 1 });
      const currentCart = await cartApi.get();
      if (currentCart && currentCart.items) {
        setCart(currentCart.items, currentCart.total_price || 0);
        toast.success(`Added ${book.name} to cart`);
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to add to cart');
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
        } else {
          throw detail.reason;
        }

        if (recommendations.status === 'fulfilled') {
          const data = recommendations.value?.data ?? recommendations.value;
          setRelatedBooks(Array.isArray(data?.similar_books) ? data.similar_books : []);
        }
      } catch (err) {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : 'Failed to load book detail');
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadDetail();
    return () => {
      mounted = false;
    };
  }, [id]);

  const featured = book ? toFeaturedBook(book, 0) : null;
  const categoryName = book?.category?.category_id ?? 'Book';
  const price = formatPrice(book?.price ?? book?.pricing?.price);
  const total = formatPrice((book?.price ?? book?.pricing?.price ?? 0) + 4);

  return (
    <RouteShell title={featured?.title ?? 'Book detail'} subtitle={book?.short_description ?? 'Browse detailed information and recommendations.'}>
      <section className="mx-auto max-w-page px-6 pb-16 pt-0 lg:px-10 xl:px-24">
        <Link href="/books" className="inline-flex items-center gap-2 text-[14px] font-medium tracking-[-0.18px] text-graphite transition hover:text-charcoal">
          <ArrowLeft className="h-4 w-4" />
          Back to books
        </Link>

        {loading ? (
          <div className="mt-8 rounded-cards-lg border border-stone-surface bg-white p-6 text-sm text-graphite" style={{ boxShadow: 'var(--shadow-sm)' }}>
            Loading book detail...
          </div>
        ) : error ? (
          <div className="mt-8 rounded-cards-lg border border-coral-red/20 bg-coral-red/5 p-6 text-coral-red" style={{ boxShadow: 'var(--shadow-sm)' }}>
            <p className="font-semibold">Unable to load book detail</p>
            <p className="mt-2 text-sm text-graphite">{error}</p>
          </div>
        ) : book ? (
          <>
            <div className="mt-6 grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
              <div className="rounded-cards-lg bg-white p-5" style={{ boxShadow: 'var(--shadow-sm)' }}>
                <div className="relative overflow-hidden rounded-cards bg-stone-surface/20 flex items-center justify-center p-8 min-h-[520px]">
                  {book.images?.[0]?.url ? (
                    <img
                      src={book.images[0].url}
                      alt={book.images[0].alt || book.name}
                      className="max-h-[520px] w-auto object-contain rounded-cards shadow-2xl"
                    />
                  ) : (
                    <div className="mb-4 h-[420px] w-[280px] rounded-cards border border-stone-surface bg-parchment shadow-2xl flex items-center justify-center text-graphite/50 text-sm font-medium">
                      No Image Available
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-6">
                <div className="space-y-3">
                  <div className="inline-flex items-center gap-2 rounded-pill border border-deep-amber/20 bg-sunburst/10 px-4 py-2 text-[12px] font-semibold uppercase tracking-[0.16em] text-deep-amber">
                    {categoryName}
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-[14px] text-graphite">
                    <span className="inline-flex items-center gap-1.5 rounded-pill border border-stone-surface bg-white px-3 py-1.5 font-medium text-charcoal shadow-sm">
                      <Star className="h-4 w-4 fill-sunburst text-sunburst" />
                      4.9
                    </span>
                    <span>{book.stock_quantity} in stock</span>
                  </div>
                </div>

                <p className="max-w-[560px] text-[17px] leading-[1.47] tracking-[-0.22px] text-graphite">
                  {book.detail_description || book.short_description || 'This book detail page is now driven by backend data.'}
                </p>

                <div className="flex flex-wrap items-center gap-4">
                  <Button onClick={handleAddToCart} disabled={addingToCart}>
                    <ShoppingCart className="mr-2 h-4 w-4" />
                    {addingToCart ? 'Adding...' : 'Add to cart'}
                  </Button>
                  <Button variant="outline" onClick={handleBuyNow}>
                    Buy now
                  </Button>
                </div>
              </div>
            </div>

            <div className="mt-16 grid gap-6 lg:grid-cols-[1fr_0.9fr]">
              <div className="rounded-cards-lg bg-white p-8" style={{ boxShadow: 'var(--shadow-subtle)' }}>
                <h2 className="font-inter text-[28px] font-semibold tracking-[-0.5px] text-midnight">Description</h2>
                <p className="mt-4 text-[15px] leading-[1.47] tracking-[-0.2px] text-graphite">
                  {book.detail_description || book.short_description || 'No description available.'}
                </p>
              </div>

              <div className="rounded-cards-lg bg-parchment p-8" style={{ boxShadow: 'var(--shadow-subtle)' }}>
                <h2 className="font-inter text-[28px] font-semibold tracking-[-0.5px] text-midnight">Order summary</h2>
                <div className="mt-5 space-y-3 text-[15px] tracking-[-0.2px] text-graphite">
                  <div className="flex items-center justify-between"><span>Price</span><span>{price}</span></div>
                  <div className="flex items-center justify-between"><span>Shipping</span><span>$4</span></div>
                  <div className="flex items-center justify-between border-t border-stone-surface pt-3 font-medium text-charcoal"><span>Total</span><span>{total}</span></div>
                </div>
              </div>
            </div>

            <div className="mt-16">
              <div className="mb-8">
                <h2 className="font-inter text-[32px] font-semibold tracking-[-0.7px] text-midnight">Related books</h2>
              </div>
              {relatedBooks.length === 0 ? (
                <div className="rounded-cards-lg border border-dashed border-stone-surface bg-parchment p-12 text-center text-sm text-graphite">
                  No related books found.
                </div>
              ) : (
                <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
                  {relatedBooks.map((related) => (
                    <article key={related.book_id} className="rounded-cards bg-white p-4 transition duration-200 hover:shadow-card-hover" style={{ boxShadow: 'var(--shadow-subtle)' }}>
                      <div className="h-40 rounded-tags bg-gradient-to-br from-parchment to-stone-surface" />
                      <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-ash">Suggested</p>
                      <h3 className="mt-1 text-[17px] font-medium tracking-[-0.22px] text-charcoal">{related.title}</h3>
                      <p className="mt-1 text-[15px] text-graphite">Score {related.score}</p>
                    </article>
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
