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
    <article className="group overflow-hidden rounded-[24px] border border-[#e7ddcf] bg-white shadow-[0_10px_30px_rgba(83,63,36,0.06)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_18px_44px_rgba(83,63,36,0.12)]">
      <div className="relative h-72 overflow-hidden p-5" style={{ background: image }}>
        <div className="absolute inset-0 bg-gradient-to-b from-white/0 via-white/0 to-black/20" />
        <div className="relative flex h-full flex-col justify-between">
          <div className="flex items-start justify-between">
            <span className="rounded-full bg-white/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7b4f2c] backdrop-blur">
              {category}
            </span>
            <span className="rounded-full bg-white/85 px-3 py-1 text-xs font-semibold text-[#1e1a16] backdrop-blur">
              <Star className="mr-1 inline h-3.5 w-3.5 fill-[#c08a45] text-[#c08a45]" />
              {rating}
            </span>
          </div>
          <div className="rounded-[20px] border border-white/35 bg-white/20 p-4 backdrop-blur-sm">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-white/85">Featured</p>
            <h3 className="mt-2 font-serif text-2xl text-white">{title}</h3>
            <p className="mt-1 text-sm text-white/85">by {author}</p>
          </div>
        </div>
      </div>
      <div className="flex items-center justify-between gap-4 p-5">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-[#8b8176]">Price</p>
          <p className="mt-1 text-lg font-semibold text-[#1e1a16]">{price}</p>
        </div>
        <Button size="sm">
          Add to cart
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </article>
  );
}
