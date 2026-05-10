import Link from 'next/link';
import { Headphones, RotateCcw, Truck, WalletCards } from 'lucide-react';

interface ServicesSectionProps {
  services: Array<{ title: string; desc: string; icon: string }>;
}

const serviceIcons = [Truck, WalletCards, Headphones, RotateCcw];
const iconColors = ['text-ember', 'text-meadow', 'text-sky-accent', 'text-sunburst'];
const iconBgColors = ['bg-ember/10', 'bg-meadow/10', 'bg-sky-accent/10', 'bg-sunburst/10'];

export function ServicesSection({ services }: ServicesSectionProps) {
  return (
    <section className="mx-auto max-w-page border-y border-stone-surface px-6 py-12 lg:px-10 xl:px-24">
      {/* Section heading — Inter 44px/600 */}
      <div className="mb-8 flex items-end justify-between gap-4">
        <h2 className="font-inter text-[44px] font-semibold leading-[1.09] tracking-[-1.14px] text-midnight">Services</h2>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {services.map((service, index) => {
          const Icon = serviceIcons[index % serviceIcons.length];
          return (
            <div
              key={service.title}
              className="flex items-start gap-4 rounded-cards bg-white p-6"
              style={{ boxShadow: '#f2f0ed 0px 0px 0px 1px inset' }}
            >
              <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-icons ${iconBgColors[index % iconBgColors.length]} ${iconColors[index % iconColors.length]}`}>
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[14px] font-medium tracking-[-0.18px] text-charcoal">{service.title}</p>
                <p className="text-[13px] leading-[1.47] tracking-[-0.17px] text-graphite">{service.desc}</p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
