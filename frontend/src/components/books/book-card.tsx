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
  image: 'linear-gradient(135deg, #f8f7f4 0%, #f2f0ed 100%)',
};

export function BookCard({ book, className, compact, href }: BookCardProps) {
  const currentBook = book ?? fallbackBook;

  const content = (
    <article
      className={cn(
        'group overflow-hidden rounded-cards bg-white transition duration-200 ease-out hover:shadow-card-hover',
        compact ? 'space-y-3 p-3' : 'space-y-4 p-4',
        className,
      )}
      style={{ boxShadow: 'var(--shadow-subtle)' }}
    >
      {/* Cover image / gradient */}
      <div
        className={cn(
          'relative overflow-hidden rounded-tags bg-parchment transition duration-200 ease-out',
          compact ? 'h-[132px]' : 'h-56',
        )}
        style={
          currentBook.image.startsWith('http') || currentBook.image.startsWith('/')
            ? { backgroundImage: `url(${currentBook.image})`, backgroundSize: 'cover', backgroundPosition: 'center' }
            : { background: currentBook.image }
        }
      />

      {/* Book info */}
      {!compact ? (
        <div className="space-y-2">
          <h3 className="line-clamp-2 text-[15px] font-medium tracking-[-0.2px] text-charcoal">{currentBook.title}</h3>
          <p className="text-[13px] tracking-[-0.17px] text-ash">By {currentBook.author}</p>
          <div className="flex items-center justify-between gap-3 text-[13px]">
            <span className="inline-flex items-center gap-1 text-sunburst">
              <span aria-hidden="true">★</span>
              {currentBook.rating}
            </span>
            <span className="font-semibold text-charcoal">{currentBook.price}</span>
          </div>
        </div>
      ) : (
        <div className="space-y-1.5">
          <h3 className="line-clamp-2 text-[14px] font-medium tracking-[-0.18px] text-charcoal">{currentBook.title}</h3>
          <p className="text-[12px] tracking-[-0.14px] text-ash">By {currentBook.author}</p>
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
