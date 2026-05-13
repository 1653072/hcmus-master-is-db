import { BookCard, type FeaturedBook } from '@/components/books/book-card';
import { cn } from '@/lib/cn';

interface RankedBookTileProps {
  id: string;
  title: string;
  rank: number;
  metricLabel: string;
  metricValue: string;
  book?: FeaturedBook;
  className?: string;
}

const fallbackImage = 'linear-gradient(135deg, var(--surface-card) 0%, var(--surface-recessed-panel) 100%)';

export function RankedBookTile({
  id,
  title,
  rank,
  metricLabel,
  metricValue,
  book,
  className,
}: RankedBookTileProps) {
  const displayBook: FeaturedBook = {
    id,
    title: title || 'Chưa có tên sách',
    author: book?.author || 'Chưa rõ tác giả',
    category: metricLabel,
    price: metricValue,
    image: book?.image || fallbackImage,
    rawTitle: book?.rawTitle,
  };

  return (
    <div className={cn('relative', className)}>
      <span className="absolute left-3 top-3 z-10 inline-flex h-9 min-w-9 items-center justify-center rounded-tags bg-ember px-2 text-[13px] font-semibold text-white shadow-sm">
        {String(rank).padStart(2, '0')}
      </span>
      <BookCard book={displayBook} compact href={`/books/${id}`} className="h-full" />
    </div>
  );
}
