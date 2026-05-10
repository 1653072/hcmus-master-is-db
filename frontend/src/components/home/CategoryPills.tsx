import Link from 'next/link';
import { ArrowRight, BookOpen, Brain, ChevronRight, Compass, Gem, Rocket } from 'lucide-react';

interface CategoryPillsProps {
  categories: string[];
}

function toSlug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

const categoryIcons = [BookOpen, Compass, Rocket, Brain, Gem];
const iconColors = ['text-ember', 'text-sky-accent', 'text-meadow', 'text-violet-pop', 'text-sunburst'];
const iconBackgrounds = ['bg-ember/10', 'bg-sky-accent/10', 'bg-meadow/10', 'bg-violet-pop/10', 'bg-sunburst/10'];

export function CategoryPills({ categories }: CategoryPillsProps) {
  return (
    <section className="mx-auto max-w-page px-6 py-16 lg:px-10 xl:px-24">
      {/* Section heading */}
      <div className="mb-8 flex items-end justify-between gap-4">
        <h2 className="font-inter text-[44px] font-semibold leading-[1.09] tracking-[-1.14px] text-midnight">Categories</h2>
        <Link className="inline-flex items-center gap-2 text-[14px] font-medium tracking-[-0.18px] text-ember transition hover:text-ember/80" href="/categories">
          See all
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      {/* Pills — pill-shaped with stone border */}
      <div className="flex gap-3 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {categories.map((item, index) => {
          const Icon = categoryIcons[index % categoryIcons.length];
          return (
            <Link
              key={item}
              href={`/categories/${toSlug(item)}`}
              className="inline-flex min-h-12 shrink-0 items-center gap-3 rounded-pill bg-white px-5 py-3 text-[14px] font-medium tracking-[-0.18px] text-graphite transition hover:bg-parchment hover:text-charcoal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember/40"
              style={{ boxShadow: 'var(--shadow-subtle)' }}
            >
              <span className={`flex h-9 w-9 items-center justify-center rounded-icons ${iconBackgrounds[index % iconBackgrounds.length]} ${iconColors[index % iconColors.length]}`}>
                <Icon className="h-4 w-4" />
              </span>
              <span>{item}</span>
              <ChevronRight className="h-4 w-4 text-fog" />
            </Link>
          );
        })}
      </div>
    </section>
  );
}
