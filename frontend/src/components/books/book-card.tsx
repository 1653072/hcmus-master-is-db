import Link from 'next/link';

import { cn } from '@/lib/cn';

export interface FeaturedBook {
  id?: string;
  title: string;
  author: string;
  category: string;
  price: string;
  rating: string;
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
  title: 'Featured book',
  author: 'Paper Haven',
  category: 'Books',
  price: '$0.00',
  rating: '0.0',
  image: 'linear-gradient(135deg, #f4ede4 0%, #e7ddcf 100%)',
};

export function BookCard({ book, className, compact, href = '/books/1' }: BookCardProps) {
  const currentBook = book ?? fallbackBook;

  const content = (
    <article
      className={cn(
        'group overflow-hidden rounded-[24px] border border-stone-200/90 bg-white/90 shadow-[0_10px_28px_rgba(68,53,33,0.08)] transition duration-200 ease-out-quart hover:-translate-y-0.5 hover:shadow-[0_18px_38px_rgba(68,53,33,0.12)]',
        compact ? 'space-y-3 p-3' : 'space-y-4 p-4 group-hover:-translate-y-0.5',
        className,
      )}
    >
      <div
        className={cn(
          'relative overflow-hidden rounded-[18px] border border-[#e7ddcf] bg-white shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] transition duration-200 ease-out-quart group-hover:border-stone-300',
          compact ? 'h-[132px]' : 'h-56',
        )}
        style={{ background: currentBook.image }}
      />
      {!compact ? (
        <div className="space-y-2">
          <h3 className="line-clamp-2 font-display text-[1.05rem] leading-tight text-[#201913]">{currentBook.title}</h3>
          <p className="text-sm text-[#8e867a]">By {currentBook.author}</p>
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="inline-flex items-center gap-1 text-[#c58b36]">
              <span aria-hidden="true">★</span>
              {currentBook.rating}
            </span>
            <span className="font-semibold text-[#201913]">{currentBook.price}</span>
          </div>
        </div>
      ) : (
        <div className="space-y-1.5">
          <h3 className="line-clamp-2 font-display text-[0.98rem] leading-tight text-[#201913]">{currentBook.title}</h3>
          <p className="text-xs text-[#8e867a]">By {currentBook.author}</p>
        </div>
      )}
    </article>
  );

  if (href) {
    return (
      <Link href={href} className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/40">
        {content}
      </Link>
    );
  }

  return content;
}
