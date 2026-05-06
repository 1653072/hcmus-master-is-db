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
      <section className="mx-auto max-w-[1280px] px-6 pb-16 pt-0 lg:px-10 xl:px-14">
        <Link href="/books" className="inline-flex items-center gap-2 text-sm font-medium text-zinc-600 transition hover:text-zinc-900">
          <ArrowLeft className="h-4 w-4" />
          Back to books
        </Link>

        <div className="mt-6 grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-[32px] border border-stone-200 bg-white/85 p-5 shadow-[0_10px_28px_rgba(68,53,33,0.06)]">
            <div className="relative overflow-hidden rounded-[24px] bg-gradient-to-br from-slate-900 via-slate-800 to-stone-900 p-8">
              <div className="flex h-[520px] items-end justify-center rounded-[18px] border border-white/10 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.08),_transparent_55%)]">
                <div className="mb-4 h-[420px] w-[280px] rounded-[18px] border border-white/15 bg-[linear-gradient(160deg,#0c1724_0%,#111f2f_45%,#223346_100%)] shadow-[0_24px_60px_rgba(0,0,0,0.32)]" />
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-amber-900">
                Psychology
              </div>
              <div className="flex flex-wrap items-center gap-3 text-sm text-zinc-600">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-stone-200 bg-white px-3 py-1.5 font-medium text-zinc-800 shadow-[0_8px_20px_rgba(68,53,33,0.05)]">
                  <Star className="h-4 w-4 fill-[#d19c3e] text-[#d19c3e]" />
                  4.9
                </span>
                <span>1.2k reviews</span>
                <span>•</span>
                <span>In stock</span>
              </div>
            </div>

            <p className="max-w-2xl text-[1.05rem] leading-8 text-zinc-600">
              This detailed page keeps the same editorial design language as the homepage while making the product information and purchase actions the focus.
            </p>

            <div className="flex flex-wrap items-center gap-4">
              <Button>
                <ShoppingCart className="h-4 w-4" />
                Add to cart
              </Button>
              <Button variant="outline">
                Buy now
              </Button>
            </div>
          </div>
        </div>

        <div className="mt-16 grid gap-6 lg:grid-cols-[1fr_0.9fr]">
          <div className="rounded-[28px] border border-stone-200 bg-white/85 p-6 shadow-[0_10px_28px_rgba(68,53,33,0.06)]">
            <div className="h-1.5 w-14 rounded-full bg-orange-200" aria-hidden="true" />
            <h2 className="mt-3 font-display text-[clamp(1.75rem,3vw,2.1rem)] leading-[1.05] tracking-[-0.02em] text-zinc-900">Description</h2>
            <p className="mt-4 text-sm leading-7 text-zinc-600">
              The detailed description area mirrors the same premium, editorial mood of the homepage. It gives enough room for product copy, author notes, and publication details.
            </p>
          </div>

          <div className="rounded-[28px] border border-stone-200 bg-stone-50/80 p-6 shadow-[0_10px_28px_rgba(68,53,33,0.05)]">
            <div className="h-1.5 w-14 rounded-full bg-orange-200" aria-hidden="true" />
            <h2 className="mt-3 font-display text-[clamp(1.75rem,3vw,2.1rem)] leading-[1.05] tracking-[-0.02em] text-zinc-900">Order summary</h2>
            <div className="mt-5 space-y-3 text-sm text-zinc-600">
              <div className="flex items-center justify-between"><span>Price</span><span>$32</span></div>
              <div className="flex items-center justify-between"><span>Shipping</span><span>$4</span></div>
              <div className="flex items-center justify-between border-t border-stone-200 pt-3 font-semibold text-zinc-900"><span>Total</span><span>$36</span></div>
            </div>
          </div>
        </div>

        <div className="mt-16">
          <div className="mb-8 space-y-2">
            <div className="h-1.5 w-14 rounded-full bg-orange-200" aria-hidden="true" />
            <h2 className="font-display text-[clamp(1.75rem,3vw,2.35rem)] leading-[1.05] tracking-[-0.02em] text-zinc-900">Related books</h2>
          </div>
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {relatedBooks.map((book) => (
              <article key={book.title} className="rounded-[28px] border border-stone-200 bg-white/85 p-3 shadow-[0_10px_28px_rgba(68,53,33,0.06)] transition duration-200 ease-out-quart hover:-translate-y-0.5 hover:shadow-[0_18px_36px_rgba(68,53,33,0.1)]">
                <div className="h-40 rounded-[20px]" style={{ background: book.image }} />
                <p className="mt-3 text-xs font-semibold uppercase tracking-[0.22em] text-zinc-500">{book.category}</p>
                <h3 className="mt-1 font-display text-[1.15rem] leading-tight tracking-[-0.02em] text-zinc-900">{book.title}</h3>
                <p className="mt-1 text-sm text-zinc-600">{book.price}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </RouteShell>
  );
}
