import Link from 'next/link';
import { ArrowRight, BookOpen, ChevronRight } from 'lucide-react';
import { CommerceSection } from '@/components/ui/commerce';

export interface CategoryPillItem {
  id?: string;
  label: string;
  slug?: string;
}

interface CategoryPillsProps {
  categories: CategoryPillItem[];
}

export function CategoryPills({ categories }: CategoryPillsProps) {
  return (
    <CommerceSection>
      <div className="mb-8 flex items-end justify-between gap-4">
        <div>
          <p className="text-[12px] font-medium uppercase tracking-[0.18em] text-ember">Danh mục</p>
          <h2 className="mt-2 text-[32px] font-semibold leading-tight text-charcoal md:text-[40px]">Chọn nhanh theo gu đọc</h2>
        </div>
        <Link className="inline-flex items-center gap-2 text-[14px] font-medium text-ember transition hover:text-coral-red" href="/categories">
          Xem tất cả
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="commerce-rail flex gap-3 overflow-x-auto pb-2">
        {categories.map((item, index) => {
          const href = item.slug || item.id || '';
          const label = item.label || `Tủ sách ${index + 1}`;

          return (
            <Link
              key={href || label}
              href={href ? `/categories/${href}` : '/categories'}
              className="inline-flex min-h-14 shrink-0 items-center gap-3 rounded-cards bg-white px-4 py-3 text-[14px] font-medium text-graphite transition hover:-translate-y-0.5 hover:bg-parchment hover:text-charcoal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember/35"
              style={{ boxShadow: 'var(--shadow-subtle)' }}
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-icons bg-ember/10 text-ember">
                <BookOpen className="h-4 w-4" />
              </span>
              <span>{label}</span>
              <ChevronRight className="h-4 w-4 text-fog" />
            </Link>
          );
        })}
      </div>
    </CommerceSection>
  );
}
