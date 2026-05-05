import Link from 'next/link';
import { ArrowRight, Check, Circle } from 'lucide-react';

import { BookCard, type FeaturedBook } from '@/components/books/book-card';
import { Button } from '@/components/ui/button';

interface HeroSectionProps {
  books: FeaturedBook[];
}

export function HeroSection({ books }: HeroSectionProps) {
  return (
    <section className="overflow-hidden">
      <div className="mx-auto grid max-w-[1280px] gap-12 px-6 py-14 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:px-10 lg:py-20 xl:px-24">
        <div className="max-w-2xl space-y-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-amber-900">
            Curated reads for thoughtful browsing
          </div>
          <div className="space-y-6">
            <h1 className="max-w-xl font-display text-[clamp(3.25rem,7vw,5.75rem)] font-normal leading-[0.94] tracking-[-0.04em] text-zinc-900">
              Find the next book worth staying up for.
            </h1>
            <p className="max-w-xl text-[1.05rem] leading-8 text-zinc-600">
              Discover a bookstore built for calm comparison, clear recommendations, and quick paths from curiosity to checkout.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <Button size="lg" asChild>
              <Link href="/books">
                Explore books
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button variant="outline" size="lg" asChild>
              <Link href="/best-sellers">
                View best sellers
              </Link>
            </Button>
          </div>
          <div className="grid max-w-xl grid-cols-3 gap-4 rounded-[28px] border border-stone-200 bg-white/70 p-5 shadow-[0_12px_32px_rgba(68,53,33,0.06)] backdrop-blur-sm">
            {[
              ['Fast discovery', 'Curated sections and rankings'],
              ['Clear details', 'Compare before you commit'],
              ['Smooth checkout', 'Built for confident buying'],
            ].map(([title, desc]) => (
              <div key={title} className="space-y-1">
                <div className="flex items-center gap-2 text-zinc-900">
                  <Check className="h-4 w-4 text-orange-500" />
                  <p className="text-sm font-semibold text-zinc-900">{title}</p>
                </div>
                <p className="text-sm leading-6 text-zinc-600">{desc}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="relative">
          <div className="absolute inset-x-6 top-10 h-[420px] rounded-[40px] bg-gradient-to-br from-amber-100/90 via-stone-100 to-orange-100/70 blur-2xl" />
          <div className="relative grid gap-4 sm:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-4 rounded-[32px] border border-stone-200 bg-white/85 p-5 shadow-[0_18px_50px_rgba(68,53,33,0.10)] backdrop-blur-sm">
              <div className="h-3 w-20 rounded-full bg-amber-100" />
              {books[0] ? <BookCard book={books[0]} href={books[0].id ? `/books/${books[0].id}` : '/books'} /> : null}
            </div>
            <div className="space-y-4 pt-8">
              {books.slice(1, 3).map((book, index) => (
                <div key={book.title} className={`rounded-[28px] border border-stone-200 bg-white/85 p-4 shadow-[0_18px_42px_rgba(68,53,33,0.08)] backdrop-blur-sm ${index === 0 ? 'translate-y-2' : 'translate-y-0'}`}>
                  <BookCard book={book} compact href={book.id ? `/books/${book.id}` : '/books'} />
                </div>
              ))}
              {books.length < 3 ? <div className="rounded-[28px] border border-dashed border-stone-300 bg-white/60 p-8 text-sm text-zinc-500">More featured books will appear here once the catalog loads.</div> : null}
            </div>
          </div>
          <div className="mt-5 flex items-center justify-between rounded-[24px] border border-stone-200 bg-white/80 px-5 py-4 shadow-[0_10px_28px_rgba(68,53,33,0.06)] backdrop-blur-sm">
            <div>
              <p className="text-sm font-semibold text-zinc-900">Popular this week</p>
              <p className="text-sm text-zinc-600">Bestsellers, reviews, and new arrivals in one calm view.</p>
            </div>
            <div className="flex items-center gap-2">
              <Circle className="h-3.5 w-3.5 fill-orange-500 text-orange-500" />
              <Circle className="h-3.5 w-3.5 fill-stone-300 text-stone-300" />
              <Circle className="h-3.5 w-3.5 fill-stone-300 text-stone-300" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
