import { Button } from '@/components/ui/button';

interface BooksToolbarProps {
  count: number;
}

const quickFilters = ['All books', 'Popular', 'New arrivals', 'Best price'];

export function BooksToolbar({ count }: BooksToolbarProps) {
  return (
    <div className="mb-8 rounded-cards-lg border border-stone-surface bg-white px-5 py-5 backdrop-blur-sm md:px-6 md:py-6" style={{ boxShadow: 'var(--shadow-sm)' }}>
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-3">
          <div className="h-1.5 w-14 rounded-full bg-ember" aria-hidden="true" />
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-ash">Browse catalog</p>
            <h1 className="mt-2 font-display text-[clamp(2.35rem,4vw,3.35rem)] leading-[0.95] tracking-[-0.03em] text-charcoal">Books</h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-graphite">{count} titles curated for discovery, comparison, and a faster path to checkout.</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2.5 lg:justify-end">
          {quickFilters.map((item, index) => (
            <Button
              key={item}
              variant={index === 0 ? 'primary' : 'outline'}
            >
              {item}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}
