import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

import { SectionHeader } from '@/components/books/section-header';
import { type FeaturedBook } from '@/components/books/book-card';

interface TrendingSectionProps {
  books: FeaturedBook[];
}

export function TrendingSection({ books }: TrendingSectionProps) {
  return (
    <section className="mx-auto max-w-[1280px] px-6 py-16 lg:px-10 xl:px-24">
      <SectionHeader
        title="Best seller of all time"
        subtitle="A showcase of books that consistently draw attention and conversions."
        action={
          <Link className="inline-flex items-center gap-2 text-sm font-semibold text-zinc-800 transition hover:text-orange-600" href="/books">
            See all
            <ArrowRight className="h-4 w-4" />
          </Link>
        }
      />
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        {books.map((book, index) => (
          <article key={book.title} className="overflow-hidden rounded-[28px] border border-stone-200 bg-white/85 shadow-[0_10px_28px_rgba(68,53,33,0.06)] transition duration-200 ease-out-quart hover:-translate-y-0.5 hover:shadow-[0_18px_34px_rgba(68,53,33,0.1)]">
            <div className={`relative flex h-64 items-start justify-center overflow-hidden ${['bg-gradient-to-br from-sky-200 to-sky-400', 'bg-gradient-to-br from-amber-200 to-amber-400', 'bg-gradient-to-br from-zinc-200 to-zinc-400', 'bg-gradient-to-br from-zinc-500 to-zinc-700'][index] ?? 'bg-gradient-to-br from-sky-200 to-sky-400'}`}>
              <div className="mt-28 h-40 w-40 rounded-lg bg-white/70 shadow-lg backdrop-blur-[1px]" />
              <div className="absolute right-3 top-3 h-8 w-8 rounded-full bg-black/10" />
            </div>
            <div className="space-y-3 p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-base font-semibold text-zinc-900">{book.title}</h3>
                  <p className="mt-1 text-xs text-zinc-500">By {book.author}</p>
                </div>
                <div className="text-right text-base font-bold text-zinc-900">
                  {book.price}
                  <span className="ml-2 text-[10px] font-normal text-zinc-500 line-through">$41</span>
                </div>
              </div>
              <div className="flex items-center justify-between border-t border-stone-200 pt-3">
                <div className="flex items-center gap-1.5 text-sm text-zinc-700">
                  <span className="h-2.5 w-2.5 rounded-full bg-orange-400" />
                  {book.rating}
                </div>
                <div className="h-9 w-9 rounded-full border border-stone-300 bg-white" />
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
