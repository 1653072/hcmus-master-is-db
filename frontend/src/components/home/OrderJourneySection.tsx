import Link from 'next/link';
import { ArrowRight, CreditCard, Headphones, RotateCcw, Search, ShieldCheck, Truck } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { CommerceSection } from '@/components/ui/commerce';

const journeySteps = [
  {
    title: 'Chọn sách',
    description: 'Tìm, lọc và xem nhanh thông tin cần thiết trước khi thêm vào giỏ.',
    icon: Search,
  },
  {
    title: 'Thanh toán',
    description: 'Kiểm tra số lượng, địa chỉ giao hàng và gửi đơn trong một luồng gọn.',
    icon: CreditCard,
  },
  {
    title: 'Nhận sách',
    description: 'Theo dõi trạng thái đơn, nhận sách tại nhà và liên hệ hỗ trợ khi cần.',
    icon: Truck,
  },
] as const;

const carePolicies = [
  {
    label: 'Sách chính hãng',
    icon: ShieldCheck,
  },
  {
    label: 'Đổi trả 30 ngày',
    icon: RotateCcw,
  },
  {
    label: 'Hỗ trợ sau mua',
    icon: Headphones,
  },
] as const;

export function OrderJourneySection() {
  return (
    <CommerceSection className="py-[var(--section-y-lg)]">
      <div className="rounded-cards-lg border border-stone-surface bg-white px-5 py-8 shadow-card-hover sm:px-7 lg:px-9 lg:py-10">
        <div className="grid gap-9 lg:grid-cols-[0.82fr_1.18fr] lg:items-center">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-ash">Quy trình mua sách</p>
            <h2 className="mt-3 max-w-md text-[28px] font-semibold leading-tight text-charcoal md:text-[34px]">
              Chọn nhanh, thanh toán rõ, nhận sách tại nhà.
            </h2>
            <p className="mt-4 max-w-lg text-[15px] leading-7 text-graphite">
              Rút gọn hành trình mua hàng còn 3 chặng chính để khách dễ quét mắt và bắt đầu mua sách ngay.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button asChild>
                <Link href="/books" className="gap-2">
                  Bắt đầu mua sách
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </Button>
              <Button variant="secondary" asChild>
                <Link href="/orders">Theo dõi đơn hàng</Link>
              </Button>
            </div>
          </div>

          <ol className="grid gap-5 sm:grid-cols-3 sm:gap-0">
            {journeySteps.map((step, index) => {
              const Icon = step.icon;
              return (
                <li key={step.title} className="border-t border-stone-surface pt-5 first:border-t-0 first:pt-0 sm:border-l sm:border-t-0 sm:pl-6 sm:pr-6 sm:pt-0 sm:first:border-l-0 sm:first:pl-0 sm:last:pr-0">
                  <div className="flex items-center justify-between gap-4">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-buttons bg-parchment text-charcoal shadow-subtle">
                      <Icon className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <span className="text-xs font-medium text-ash">{String(index + 1).padStart(2, '0')}</span>
                  </div>
                  <h3 className="mt-5 text-[16px] font-semibold leading-6 text-charcoal">{step.title}</h3>
                  <p className="mt-2 text-[13px] leading-6 text-graphite">{step.description}</p>
                </li>
              );
            })}
          </ol>
        </div>

        <div className="mt-8 border-t border-stone-surface pt-5">
          <ul className="grid gap-3 text-[13px] font-medium text-graphite sm:grid-cols-3">
            {carePolicies.map((policy) => {
              const Icon = policy.icon;
              return (
                <li key={policy.label} className="flex items-center gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-buttons bg-parchment text-charcoal">
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <span>{policy.label}</span>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </CommerceSection>
  );
}
