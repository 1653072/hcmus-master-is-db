import Link from 'next/link';
import { ArrowRight, Star } from 'lucide-react';

import { BookCard, type FeaturedBook } from '@/components/books/book-card';
import { SectionHeader } from '@/components/books/section-header';

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
  columnsClassName = 'grid-cols-2 gap-5 md:grid-cols-4',
  backgroundClassName,
  seeAllHref = '/books',
}: BooksGridSectionProps) {
  return (
    <section className={`mx-auto max-w-page px-6 py-16 lg:px-10 xl:px-24 ${backgroundClassName ?? ''}`}>
      <SectionHeader
        title={title}
        subtitle={subtitle}
        action={
          <Link className="inline-flex items-center gap-2 text-[14px] font-medium tracking-[-0.18px] text-ember transition hover:text-ember/80" href={seeAllHref}>
            See all
            <ArrowRight className="h-4 w-4" />
          </Link>
        }
      />
      <div className={`grid ${columnsClassName}`}>
        {books.map((book) => {
          const bookHref = book.id ? `/books/${book.id}` : '/books';
          return (
            <article
              key={`${book.title}-${book.author}`}
              className="rounded-cards bg-white p-6 transition duration-200 ease-out hover:shadow-card-hover"
              style={{ boxShadow: 'var(--shadow-subtle)' }}
            >
              <BookCard book={book} compact href={bookHref} />
              <div className="mt-3 flex items-center justify-between gap-3 text-[13px] text-ash">
                <span className="inline-flex items-center gap-1.5 text-sunburst">
                  <Star className="h-4 w-4 fill-current" /> {book.rating}
                </span>
                <Link
                  href="/cart"
                  className="rounded-pill border border-stone-surface bg-white px-4 py-2 text-[13px] font-medium text-charcoal transition hover:border-graphite/30 hover:bg-parchment focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember/40"
                >
                  Add to cart
                </Link>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
