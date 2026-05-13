import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

import { BookCard, type FeaturedBook } from '@/components/books/book-card';
import { SectionHeader } from '@/components/books/section-header';
import { CommerceSection, ProductGrid } from '@/components/ui/commerce';

interface BooksGridSectionProps {
  title: string;
  subtitle?: string;
  books: FeaturedBook[];
  columnsClassName?: string;
  backgroundClassName?: string;
  seeAllHref?: string;
}

export function BooksGridSection({
  title,
  subtitle,
  books,
  columnsClassName,
  backgroundClassName,
  seeAllHref = '/books',
}: BooksGridSectionProps) {
  return (
    <CommerceSection className={`py-14 ${backgroundClassName ?? ''}`}>
      <SectionHeader
        title={title}
        subtitle={subtitle}
        action={
          <Link className="inline-flex items-center gap-2 text-[14px] font-medium text-ember transition hover:text-coral-red" href={seeAllHref}>
            Xem tất cả
            <ArrowRight className="h-4 w-4" />
          </Link>
        }
      />
      <ProductGrid className={columnsClassName}>
        {books.map((book) => {
          const bookHref = book.id ? `/books/${book.id}` : '/books';
          return <BookCard key={`${book.id ?? book.title}-${book.author}`} book={book} compact href={bookHref} />;
        })}
      </ProductGrid>
    </CommerceSection>
  );
}
