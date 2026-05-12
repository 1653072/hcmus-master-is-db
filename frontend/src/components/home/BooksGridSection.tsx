import Link from 'next/link';
import { ArrowRight, Star } from 'lucide-react';

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
          return (
            <article
              key={`${book.title}-${book.author}`}
              className="rounded-cards bg-white p-4 transition duration-200 ease-out hover:-translate-y-0.5 hover:shadow-card-hover"
              style={{ boxShadow: 'var(--shadow-subtle)' }}
            >
              <BookCard book={book} compact href={bookHref} />
              <div className="mt-3 flex items-center justify-between gap-3 text-[13px] text-ash">
                <span className="inline-flex items-center gap-1.5 text-deep-amber">
                  <Star className="h-4 w-4 fill-current" /> {book.rating}
                </span>
                <Link
                  href={bookHref}
                  className="rounded-buttons border border-stone-surface bg-white px-3 py-2 text-[13px] font-medium text-charcoal transition hover:border-ember/40 hover:bg-parchment focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember/35"
                >
                  Xem và mua
                </Link>
              </div>
            </article>
          );
        })}
      </ProductGrid>
    </CommerceSection>
  );
}
