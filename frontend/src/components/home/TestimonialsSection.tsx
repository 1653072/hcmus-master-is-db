import { Quote, Star } from 'lucide-react';

interface TestimonialsSectionProps {
  testimonials: string[];
}

export function TestimonialsSection({ testimonials }: TestimonialsSectionProps) {
  return (
    <section className="mx-auto max-w-[1280px] px-6 py-16 lg:px-10 xl:px-24">
      <div className="mb-10 text-center">
        <div className="mx-auto mb-3 h-1.5 w-14 rounded-full bg-orange-200" aria-hidden="true" />
        <h2 className="font-display text-[clamp(1.75rem,3vw,2.35rem)] leading-[1.05] tracking-[-0.02em] text-zinc-900">Our happy customers</h2>
        <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-zinc-600">A few notes from readers who value the calm browsing flow and clean product discovery.</p>
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        {testimonials.map((quote, index) => (
          <article key={index} className="rounded-[28px] border border-stone-200 bg-white/85 p-6 shadow-[0_10px_28px_rgba(68,53,33,0.06)]">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-stone-200 to-amber-100 text-orange-600">
                  <Quote className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-zinc-900">Customer {index + 1}</p>
                  <p className="text-xs text-zinc-500">Verified reader</p>
                </div>
              </div>
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-50 text-orange-500">
                <Star className="h-4 w-4 fill-current" />
              </div>
            </div>
            <p className="mt-5 text-sm leading-7 text-zinc-600">{quote}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
