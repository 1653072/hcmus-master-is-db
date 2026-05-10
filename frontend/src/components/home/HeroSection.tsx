import Link from 'next/link';
import { ArrowRight, Check } from 'lucide-react';

import { BookCard, type FeaturedBook } from '@/components/books/book-card';
import { Button } from '@/components/ui/button';

interface HeroSectionProps {
  books: FeaturedBook[];
}

export function HeroSection({ books }: HeroSectionProps) {
  return (
    <section className="overflow-hidden bg-canvas">
      <div className="mx-auto grid max-w-page gap-12 px-6 py-14 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:px-10 lg:py-20 xl:px-24">
        <div className="max-w-2xl space-y-8">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 rounded-pill bg-parchment px-4 py-2 text-[12px] font-medium uppercase tracking-[0.16em] text-graphite">
            Curated reads for thoughtful browsing
          </div>

          {/* Headline — Fraunces display, charcoal, tight tracking */}
          <div className="space-y-6">
            <h1 className="max-w-xl font-display text-[clamp(2.75rem,7vw,4.25rem)] font-medium leading-[1.09] tracking-[-0.031em] text-charcoal">
              Find the next book worth staying up for.
            </h1>
            <p className="max-w-xl text-[17px] leading-[1.47] tracking-[-0.22px] text-graphite">
              Discover a bookstore built for calm comparison, clear recommendations, and quick paths from curiosity to checkout.
            </p>
          </div>

          {/* CTA — dark pill + light pill */}
          <div className="flex flex-wrap items-center gap-3">
            <Button size="lg" asChild>
              <Link href="/books">
                Explore books
                <ArrowRight className="ml-1.5 h-4 w-4" />
              </Link>
            </Button>
            <Button variant="secondary" size="lg" asChild>
              <Link href="/best-sellers">
                View best sellers
              </Link>
            </Button>
          </div>

          {/* Feature strip — white card with inset stone border */}
          <div
            className="grid max-w-xl grid-cols-3 gap-4 rounded-cards bg-white p-8"
            style={{ boxShadow: 'var(--shadow-subtle)' }}
          >
            {[
              ['Fast discovery', 'Curated sections and rankings'],
              ['Clear details', 'Compare before you commit'],
              ['Smooth checkout', 'Built for confident buying'],
            ].map(([title, desc]) => (
              <div key={title} className="space-y-1">
                <div className="flex items-center gap-2 text-charcoal">
                  <Check className="h-4 w-4 text-ember" />
                  <p className="text-[14px] font-medium tracking-[-0.18px] text-charcoal">{title}</p>
                </div>
                <p className="text-[13px] leading-[1.47] tracking-[-0.17px] text-graphite">{desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Right column — Book cards */}
        <div className="relative">
          {/* Soft gradient blob */}
          <div className="absolute inset-x-6 top-10 h-[420px] rounded-illustrations bg-gradient-to-br from-sunburst/10 via-parchment to-ember/5 blur-2xl" />

          <div className="relative grid gap-4 sm:grid-cols-[1.1fr_0.9fr]">
            {/* Featured book card */}
            <div
              className="space-y-4 rounded-cards-lg bg-white p-5 backdrop-blur-sm"
              style={{ boxShadow: 'var(--shadow-subtle), var(--shadow-sm)' }}
            >
              <div className="h-3 w-20 rounded-full bg-parchment" />
              {books[0] ? <BookCard book={books[0]} href={books[0].id ? `/books/${books[0].id}` : '/books'} /> : null}
            </div>

            {/* Secondary book cards */}
            <div className="space-y-4 pt-8">
              {books.slice(1, 3).map((book, index) => (
                <div
                  key={book.title}
                  className={`rounded-cards bg-white p-4 backdrop-blur-sm ${index === 0 ? 'translate-y-2' : 'translate-y-0'}`}
                  style={{ boxShadow: 'var(--shadow-subtle), var(--shadow-sm)' }}
                >
                  <BookCard book={book} compact href={book.id ? `/books/${book.id}` : '/books'} />
                </div>
              ))}
              {books.length < 3 ? (
                <div className="rounded-cards border border-dashed border-stone-surface bg-parchment p-8 text-[14px] text-ash">
                  More featured books will appear here once the catalog loads.
                </div>
              ) : null}
            </div>
          </div>

          {/* Bottom bar */}
          <div
            className="mt-5 flex items-center justify-between rounded-cards bg-white px-5 py-4"
            style={{ boxShadow: 'var(--shadow-subtle)' }}
          >
            <div>
              <p className="text-[14px] font-medium tracking-[-0.18px] text-charcoal">Popular this week</p>
              <p className="text-[13px] tracking-[-0.17px] text-graphite">Bestsellers, reviews, and new arrivals in one calm view.</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-ember" />
              <span className="h-2.5 w-2.5 rounded-full bg-stone-surface" />
              <span className="h-2.5 w-2.5 rounded-full bg-stone-surface" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
