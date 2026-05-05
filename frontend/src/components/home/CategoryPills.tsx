import Link from 'next/link';
import { ArrowRight, BookOpen, Brain, ChevronRight, Compass, Gem, Rocket } from 'lucide-react';

interface CategoryPillsProps {
  categories: string[];
}

function toSlug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

const categoryIcons = [BookOpen, Compass, Rocket, Brain, Gem];

export function CategoryPills({ categories }: CategoryPillsProps) {
  return (
    <section className="mx-auto max-w-[1280px] px-6 py-16 lg:px-10 xl:px-24">
      <div className="mb-8 flex items-end justify-between gap-4">
        <div className="space-y-2">
          <div className="h-1.5 w-14 rounded-full bg-orange-200" aria-hidden="true" />
          <h2 className="font-display text-[clamp(1.75rem,3vw,2.35rem)] leading-[1.05] tracking-[-0.02em] text-zinc-900">Categories</h2>
        </div>
        <Link className="inline-flex items-center gap-2 text-sm font-semibold text-zinc-800 transition hover:text-orange-600" href="/categories">
          See all
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {categories.map((item, index) => {
          const Icon = categoryIcons[index % categoryIcons.length];
          return (
            <Link
              key={item}
              href={`/categories/${toSlug(item)}`}
              className="inline-flex min-h-12 shrink-0 items-center gap-3 rounded-full border border-stone-200 bg-white px-5 py-3 text-sm font-medium text-zinc-700 shadow-[0_8px_22px_rgba(68,53,33,0.05)] transition hover:-translate-y-0.5 hover:border-stone-300 hover:text-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/40"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-stone-100 to-amber-50 text-zinc-600">
                <Icon className="h-4.5 w-4.5" />
              </span>
              <span>{item}</span>
              <ChevronRight className="h-4 w-4 text-stone-400" />
            </Link>
          );
        })}
      </div>
    </section>
  );
}
