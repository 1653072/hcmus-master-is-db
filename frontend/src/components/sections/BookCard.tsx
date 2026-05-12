import { ArrowRight, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';

type BookCardProps = {
  title: string;
  author: string;
  category: string;
  price: string;
  rating: string;
  image: string;
};

export function BookCard({ title, author, category, price, rating, image }: BookCardProps) {
  return (
    <article className="group overflow-hidden rounded-cards-lg border border-stone-surface bg-white transition duration-200 ease-out hover:-translate-y-0.5 hover:shadow-card-hover" style={{ boxShadow: 'var(--shadow-sm)' }}>
      <div className="relative h-72 overflow-hidden p-5" style={{ background: image }}>
        <div className="absolute inset-0 bg-gradient-to-b from-white/0 via-white/0 to-midnight/20" />
        <div className="relative flex h-full flex-col justify-between">
          <div className="flex items-start justify-between">
            <span className="rounded-pill bg-white/85 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-deep-amber">
              {category}
            </span>
            <span className="rounded-pill bg-white/85 px-3 py-1 text-xs font-medium text-charcoal">
              <Star className="mr-1 inline h-3.5 w-3.5 fill-current text-deep-amber" />
              {rating}
            </span>
          </div>
          <div className="rounded-cards border border-white/35 bg-white/20 p-4">
            <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-white/85">Nổi bật</p>
            <h3 className="mt-2 font-display text-2xl font-semibold text-white">{title}</h3>
            <p className="mt-1 text-sm text-white/85">Tác giả {author}</p>
          </div>
        </div>
      </div>
      <div className="flex items-center justify-between gap-4 p-5">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-ash">Giá bán</p>
          <p className="mt-1 text-lg font-semibold text-charcoal">{price}</p>
        </div>
        <Button size="sm">
          Thêm vào giỏ
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </article>
  );
}
