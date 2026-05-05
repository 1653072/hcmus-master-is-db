import Link from 'next/link';
import { ArrowRight, ChevronRight, Headphones, RotateCcw, Truck, WalletCards } from 'lucide-react';

interface ServicesSectionProps {
  services: Array<{ title: string; desc: string; icon: string }>;
}

const serviceIcons = [Truck, WalletCards, Headphones, RotateCcw];

export function ServicesSection({ services }: ServicesSectionProps) {
  return (
    <section className="mx-auto max-w-[1280px] border-y border-stone-200 bg-stone-50/60 px-6 py-12 lg:px-10 xl:px-24">
      <div className="mb-8 flex items-end justify-between gap-4">
        <div className="space-y-2">
          <div className="h-1.5 w-14 rounded-full bg-orange-200" aria-hidden="true" />
          <h2 className="font-display text-[clamp(1.75rem,3vw,2.35rem)] leading-[1.05] tracking-[-0.02em] text-zinc-900">Services</h2>
        </div>
        <Link className="inline-flex items-center gap-2 text-sm font-semibold text-zinc-800 transition hover:text-orange-600" href="/about">
          See all
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {services.map((service, index) => {
          const Icon = serviceIcons[index % serviceIcons.length];
          return (
            <div key={service.title} className="flex items-start gap-4 rounded-[24px] border border-stone-200 bg-white/80 p-4 shadow-[0_8px_24px_rgba(68,53,33,0.05)]">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-orange-50 text-orange-600">
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-zinc-900">{service.title}</p>
                <p className="text-sm leading-6 text-zinc-600">{service.desc}</p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
