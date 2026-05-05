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
    <section className={`mx-auto max-w-[1280px] px-6 py-16 lg:px-10 xl:px-24 ${backgroundClassName ?? ''}`}>
      <SectionHeader
        title={title}
        subtitle={subtitle}
        action={
          <Link className="inline-flex items-center gap-2 text-sm font-semibold text-zinc-800 transition hover:text-orange-600" href={seeAllHref}>
            See all
            <ArrowRight className="h-4 w-4" />
          </Link>
        }
      />
      <div className={`grid ${columnsClassName}`}>
        {books.map((book) => {
          const bookHref = book.id ? `/books/${book.id}` : '/books';
          return (
            <article key={`${book.title}-${book.author}`} className="rounded-[28px] border border-stone-200/90 bg-white/85 p-4 shadow-[0_10px_28px_rgba(68,53,33,0.06)] transition duration-200 ease-out-quart hover:-translate-y-0.5 hover:shadow-[0_18px_34px_rgba(68,53,33,0.1)]">
              <BookCard book={book} compact href={bookHref} />
              <div className="mt-3 flex items-center justify-between gap-3 text-sm text-zinc-500">
                <span className="inline-flex items-center gap-1.5 text-orange-500">
                  <Star className="h-4 w-4 fill-current" /> {book.rating}
                </span>
                <Link
                  href="/cart"
                  className="rounded-full border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-zinc-800 transition hover:border-stone-400 hover:bg-stone-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/40"
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
