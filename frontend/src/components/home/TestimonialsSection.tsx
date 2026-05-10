import { Quote, Star } from 'lucide-react';

interface TestimonialsSectionProps {
  testimonials: string[];
}

export function TestimonialsSection({ testimonials }: TestimonialsSectionProps) {
  return (
    <section className="mx-auto max-w-page px-6 py-16 lg:px-10 xl:px-24">
      {/* Centered section heading */}
      <div className="mb-10 text-center">
        <h2 className="font-inter text-[44px] font-semibold leading-[1.09] tracking-[-1.14px] text-midnight">Our happy customers</h2>
        <p className="mx-auto mt-3 max-w-[560px] text-[17px] leading-[1.47] tracking-[-0.22px] text-graphite">A few notes from readers who value the calm browsing flow and clean product discovery.</p>
      </div>

      {/* Testimonial cards — white with inset stone border */}
      <div className="grid gap-3 lg:grid-cols-3">
        {testimonials.map((quote, index) => (
          <article
            key={index}
            className="rounded-cards bg-white p-8 transition duration-200 hover:shadow-card-hover"
            style={{ boxShadow: 'var(--shadow-subtle)' }}
          >
            <div className="flex items-start justify-between gap-4">
              {/* Avatar */}
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-parchment text-graphite">
                  <Quote className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-[14px] font-medium tracking-[-0.18px] text-charcoal">Customer {index + 1}</p>
                  <p className="text-[12px] tracking-[-0.14px] text-ash">Verified reader</p>
                </div>
              </div>
              {/* Star badge */}
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sunburst/10 text-sunburst">
                <Star className="h-4 w-4 fill-current" />
              </div>
            </div>
            <p className="mt-5 text-[15px] leading-[1.47] tracking-[-0.2px] text-graphite">{quote}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
