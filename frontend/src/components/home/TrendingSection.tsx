import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

import { SectionHeader } from '@/components/books/section-header';
import { type FeaturedBook } from '@/components/books/book-card';

interface TrendingSectionProps {
  books: FeaturedBook[];
}

const coverColors = [
  'bg-gradient-to-br from-sky-accent/20 to-sky-accent/50',
  'bg-gradient-to-br from-sunburst/20 to-sunburst/50',
  'bg-gradient-to-br from-stone-surface to-ash/20',
  'bg-gradient-to-br from-ember/10 to-ember/30',
];

export function TrendingSection({ books }: TrendingSectionProps) {
  return (
    <section className="mx-auto max-w-page px-6 py-16 lg:px-10 xl:px-24">
      <SectionHeader
        title="Best seller of all time"
        subtitle="A showcase of books that consistently draw attention and conversions."
        action={
          <Link className="inline-flex items-center gap-2 text-[14px] font-medium tracking-[-0.18px] text-ember transition hover:text-ember/80" href="/books">
            See all
            <ArrowRight className="h-4 w-4" />
          </Link>
        }
      />
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {books.map((book, index) => (
          <article
            key={book.title}
            className="overflow-hidden rounded-cards bg-white transition duration-200 ease-out hover:shadow-card-hover"
            style={{ boxShadow: 'var(--shadow-subtle)' }}
          >
            {/* Cover */}
            <div className={`relative flex h-64 items-start justify-center overflow-hidden ${coverColors[index] ?? coverColors[0]}`}>
              <div className="mt-28 h-40 w-40 rounded-tags bg-white/70 shadow-sm backdrop-blur-[1px]" />
            </div>

            {/* Info */}
            <div className="space-y-3 p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-[15px] font-medium tracking-[-0.2px] text-charcoal">{book.title}</h3>
                  <p className="mt-1 text-[12px] tracking-[-0.14px] text-ash">By {book.author}</p>
                </div>
                <div className="text-right text-[15px] font-semibold text-charcoal">
                  {book.price}
                </div>
              </div>
              <div className="flex items-center justify-between border-t border-stone-surface pt-3">
                <div className="flex items-center gap-1.5 text-[13px] text-graphite">
                  <span className="h-2.5 w-2.5 rounded-full bg-ember" />
                  {book.rating}
                </div>
                <Link
                  href={book.id ? `/books/${book.id}` : '/books'}
                  className="text-[13px] font-medium text-ember hover:text-ember/80 transition-colors"
                >
                  View →
                </Link>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
