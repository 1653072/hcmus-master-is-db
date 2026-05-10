import { ArrowLeft, Star, ShoppingCart } from 'lucide-react';
import Link from 'next/link';

import { RouteShell } from '@/components/layout/RouteShell';
import { Button } from '@/components/ui/button';

const relatedBooks = [
  { title: 'Quiet', category: 'Psychology', price: '$26', image: 'linear-gradient(135deg, #3a4048 0%, #12161c 100%)' },
  { title: 'Atomic Habits', category: 'Self help', price: '$24', image: 'linear-gradient(135deg, #ebe7de 0%, #c7beb2 100%)' },
  { title: 'The Creative Act', category: 'Creativity', price: '$28', image: 'linear-gradient(135deg, #32281f 0%, #7a5a43 100%)' },
  { title: 'How to Talk to Anyone', category: 'Communication', price: '$32', image: 'linear-gradient(135deg, #191814 0%, #2a2720 100%)' },
];

export default function Page() {
  return (
    <RouteShell title="Emotional intelligence" subtitle="A practical and insightful guide to understanding yourself and others better.">
      <section className="mx-auto max-w-page px-6 pb-16 pt-0 lg:px-10 xl:px-24">
        <Link href="/books" className="inline-flex items-center gap-2 text-[14px] font-medium tracking-[-0.18px] text-graphite transition hover:text-charcoal">
          <ArrowLeft className="h-4 w-4" />
          Back to books
        </Link>

        <div className="mt-6 grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-cards-lg bg-white p-5" style={{ boxShadow: 'var(--shadow-sm)' }}>
            <div className="relative overflow-hidden rounded-cards bg-gradient-to-br from-midnight via-pepper to-charcoal p-8">
              <div className="flex h-[520px] items-end justify-center rounded-cards border border-white/10 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.08),_transparent_55%)]">
                <div className="mb-4 h-[420px] w-[280px] rounded-cards border border-white/15 bg-[linear-gradient(160deg,#0c1724_0%,#111f2f_45%,#223346_100%)] shadow-2xl" />
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 rounded-pill border border-deep-amber/20 bg-sunburst/10 px-4 py-2 text-[12px] font-semibold uppercase tracking-[0.16em] text-deep-amber">
                Psychology
              </div>
              <div className="flex flex-wrap items-center gap-3 text-[14px] text-graphite">
                <span className="inline-flex items-center gap-1.5 rounded-pill border border-stone-surface bg-white px-3 py-1.5 font-medium text-charcoal shadow-sm">
                  <Star className="h-4 w-4 fill-sunburst text-sunburst" />
                  4.9
                </span>
                <span>1.2k reviews</span>
                <span>•</span>
                <span>In stock</span>
              </div>
            </div>

            <p className="max-w-[560px] text-[17px] leading-[1.47] tracking-[-0.22px] text-graphite">
              This detailed page keeps the same editorial design language as the homepage while making the product information and purchase actions the focus.
            </p>

            <div className="flex flex-wrap items-center gap-4">
              <Button>
                <ShoppingCart className="mr-2 h-4 w-4" />
                Add to cart
              </Button>
              <Button variant="outline">
                Buy now
              </Button>
            </div>
          </div>
        </div>

        <div className="mt-16 grid gap-6 lg:grid-cols-[1fr_0.9fr]">
          <div className="rounded-cards-lg bg-white p-8" style={{ boxShadow: 'var(--shadow-subtle)' }}>
            <h2 className="font-inter text-[28px] font-semibold tracking-[-0.5px] text-midnight">Description</h2>
            <p className="mt-4 text-[15px] leading-[1.47] tracking-[-0.2px] text-graphite">
              The detailed description area mirrors the same premium, editorial mood of the homepage. It gives enough room for product copy, author notes, and publication details.
            </p>
          </div>

          <div className="rounded-cards-lg bg-parchment p-8" style={{ boxShadow: 'var(--shadow-subtle)' }}>
            <h2 className="font-inter text-[28px] font-semibold tracking-[-0.5px] text-midnight">Order summary</h2>
            <div className="mt-5 space-y-3 text-[15px] tracking-[-0.2px] text-graphite">
              <div className="flex items-center justify-between"><span>Price</span><span>$32</span></div>
              <div className="flex items-center justify-between"><span>Shipping</span><span>$4</span></div>
              <div className="flex items-center justify-between border-t border-stone-surface pt-3 font-medium text-charcoal"><span>Total</span><span>$36</span></div>
            </div>
          </div>
        </div>

        <div className="mt-16">
          <div className="mb-8">
            <h2 className="font-inter text-[32px] font-semibold tracking-[-0.7px] text-midnight">Related books</h2>
          </div>
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {relatedBooks.map((book) => (
              <article key={book.title} className="rounded-cards bg-white p-4 transition duration-200 hover:shadow-card-hover" style={{ boxShadow: 'var(--shadow-subtle)' }}>
                <div className="h-40 rounded-tags" style={{ background: book.image }} />
                <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-ash">{book.category}</p>
                <h3 className="mt-1 text-[17px] font-medium tracking-[-0.22px] text-charcoal">{book.title}</h3>
                <p className="mt-1 text-[15px] text-graphite">{book.price}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </RouteShell>
  );
}
