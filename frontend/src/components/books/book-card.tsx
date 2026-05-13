import Link from 'next/link';
import { ShoppingCart, Star } from 'lucide-react';

import { cn } from '@/lib/cn';

export interface FeaturedBook {
  id?: string;
  title: string;
  author: string;
  category: string;
  price: string;
  listPrice?: string;
  discountPercent?: number;
  stockQuantity?: number;
  reviewCount?: number;
  rating?: string;
  image: string;
  rawTitle?: string;
}

interface BookCardProps {
  book?: FeaturedBook;
  className?: string;
  compact?: boolean;
  href?: string;
}

const fallbackBook: FeaturedBook = {
  title: 'Sách nổi bật',
  author: 'Paper Haven',
  category: 'Sách',
  price: 'Liên hệ',
  image: 'linear-gradient(135deg, var(--surface-card) 0%, var(--surface-recessed-panel) 100%)',
};

export function BookCard({ book, className, compact, href }: BookCardProps) {
  const currentBook = book ?? fallbackBook;
  const hasImage = currentBook.image.startsWith('http') || currentBook.image.startsWith('/');
  const hasDiscount = typeof currentBook.discountPercent === 'number' && currentBook.discountPercent > 0;
  const hasRating = typeof currentBook.rating === 'string' && currentBook.rating.trim() !== '';
  const stockLabel = typeof currentBook.stockQuantity === 'number'
    ? currentBook.stockQuantity > 0
      ? `Còn ${currentBook.stockQuantity}`
      : 'Hết hàng'
    : null;

  const content = (
    <article
      className={cn(
        'group overflow-hidden rounded-cards bg-white transition duration-200 ease-out hover:-translate-y-0.5 hover:shadow-card-hover',
        compact ? 'space-y-3 p-3' : 'space-y-4 p-4',
        className,
      )}
      style={{ boxShadow: 'var(--shadow-subtle)' }}
    >
      <div
        className={cn(
          'relative overflow-hidden rounded-tags bg-parchment transition duration-200 ease-out',
          compact ? 'h-[154px]' : 'h-60',
        )}
        style={
          hasImage
            ? {
                backgroundImage: `url(${currentBook.image})`,
                backgroundSize: 'contain',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
              }
            : { background: currentBook.image }
        }
      >
        {hasDiscount ? (
          <span className="absolute left-2 top-2 rounded-tags bg-ember px-2 py-1 text-[11px] font-medium text-white">
            -{currentBook.discountPercent}%
          </span>
        ) : null}
        {stockLabel ? (
          <span className="absolute bottom-2 right-2 rounded-tags bg-white/90 px-2 py-1 text-[11px] font-medium text-charcoal shadow-sm">
            {stockLabel}
          </span>
        ) : null}
      </div>

      {!compact ? (
        <div className="space-y-2">
          <p className="line-clamp-1 text-[11px] font-medium uppercase tracking-[0.16em] text-ember">{currentBook.category}</p>
          <h3 className="line-clamp-2 text-[15px] font-medium text-charcoal">{currentBook.title}</h3>
          <p className="text-[13px] text-ash">Tác giả {currentBook.author}</p>
          {hasRating || typeof currentBook.reviewCount === 'number' ? (
            <div className="flex items-center gap-2 text-[13px] text-ash">
              {hasRating ? (
                <span className="inline-flex items-center gap-1 text-deep-amber">
                  <Star className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
                  {currentBook.rating}
                </span>
              ) : null}
              {typeof currentBook.reviewCount === 'number' ? <span>{currentBook.reviewCount} đánh giá</span> : null}
            </div>
          ) : null}
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-[17px] font-semibold text-ember">{currentBook.price}</p>
              {currentBook.listPrice ? <p className="text-[12px] text-ash line-through">{currentBook.listPrice}</p> : null}
            </div>
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-buttons bg-ember text-white transition group-hover:bg-coral-red">
              <ShoppingCart className="h-4 w-4" aria-hidden="true" />
            </span>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="line-clamp-1 text-[10px] font-medium uppercase tracking-[0.16em] text-ember">{currentBook.category}</p>
          <h3 className="line-clamp-2 min-h-[40px] text-[14px] font-medium text-charcoal">{currentBook.title}</h3>
          <p className="line-clamp-1 text-[12px] text-ash">Tác giả {currentBook.author}</p>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[15px] font-semibold text-ember">{currentBook.price}</p>
              {currentBook.listPrice ? <p className="text-[11px] text-ash line-through">{currentBook.listPrice}</p> : null}
            </div>
            {hasRating ? (
              <span className="inline-flex items-center gap-1 text-[12px] font-medium text-deep-amber">
                <Star className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
                {currentBook.rating}
              </span>
            ) : (
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-buttons bg-ember text-white transition group-hover:bg-coral-red">
                <ShoppingCart className="h-3.5 w-3.5" aria-hidden="true" />
              </span>
            )}
          </div>
        </div>
      )}
    </article>
  );

  if (href) {
    return (
      <Link href={href} className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember/40">
        {content}
      </Link>
    );
  }

  return content;
}
