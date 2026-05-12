import Link from 'next/link';
import { BookOpen, CreditCard, Headphones, PackageCheck, RotateCcw, Search, ShieldCheck, ShoppingCart, Truck } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { CommerceSection } from '@/components/ui/commerce';

const journeySteps = [
  {
    title: 'Tìm đúng sách',
    description: 'Tìm theo tên sách, tác giả, nhà xuất bản, năm xuất bản hoặc khoảng giá.',
    icon: Search,
  },
  {
    title: 'Thêm vào giỏ',
    description: 'Kiểm tra giá, tồn kho và số lượng trước khi sang bước thanh toán.',
    icon: ShoppingCart,
  },
  {
    title: 'Xác nhận thanh toán',
    description: 'Nhập địa chỉ giao hàng, chọn phương thức thanh toán và gửi đơn.',
    icon: CreditCard,
  },
  {
    title: 'Đóng gói cẩn thận',
    description: 'Đơn sách được chuẩn bị theo tình trạng kho và đóng gói chống móp gáy.',
    icon: PackageCheck,
  },
  {
    title: 'Nhận sách tại nhà',
    description: 'Theo dõi đơn hàng và nhận sách với thông tin trạng thái rõ ràng.',
    icon: Truck,
  },
] as const;

const carePolicies = [
  {
    title: 'Sách chính hãng',
    description: 'Thông tin sách rõ ràng, dữ liệu catalog được lưu trong MongoDB để tìm và lọc nhanh.',
    icon: ShieldCheck,
  },
  {
    title: 'Đổi trả trong 30 ngày',
    description: 'Hỗ trợ đổi trả khi sách lỗi in ấn, giao sai hoặc hư hỏng trong vận chuyển.',
    icon: RotateCcw,
  },
  {
    title: 'Hỗ trợ sau mua',
    description: 'Theo dõi đơn hàng, kiểm tra trạng thái và nhận hỗ trợ khi cần cập nhật đơn.',
    icon: Headphones,
  },
] as const;

export function OrderJourneySection() {
  return (
    <CommerceSection className="py-16">
      <div className="grid gap-10 lg:grid-cols-[0.88fr_1.12fr] lg:items-start">
        <div className="lg:sticky lg:top-44">
          <p className="text-xs font-medium uppercase tracking-[0.22em] text-ember">Từ đặt sách đến nhận hàng</p>
          <h2 className="mt-3 max-w-md font-display text-[clamp(2.15rem,4vw,3.4rem)] font-semibold leading-[1.04] text-charcoal">
            Mua sách rõ từng bước, yên tâm đến lúc mở hộp.
          </h2>
          <p className="mt-4 max-w-md text-[15px] leading-7 text-graphite">
            Paper Haven giữ trải nghiệm mua sách gọn như một sàn thương mại điện tử: tìm nhanh, kiểm tra rõ, thanh toán mạch lạc và theo dõi được sau khi đặt.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button asChild>
              <Link href="/books">Bắt đầu mua sách</Link>
            </Button>
            <Button variant="secondary" asChild>
              <Link href="/orders">Theo dõi đơn hàng</Link>
            </Button>
          </div>
        </div>

        <div className="space-y-5">
          <div className="rounded-cards-lg border border-stone-surface bg-white p-4 sm:p-5" style={{ boxShadow: 'var(--shadow-sm)' }}>
            <div className="grid gap-3 md:grid-cols-5">
              {journeySteps.map((step, index) => {
                const Icon = step.icon;
                return (
                  <div key={step.title} className="rounded-cards bg-parchment p-4">
                    <div className="flex items-center justify-between gap-3">
                      <span className="flex h-9 w-9 items-center justify-center rounded-buttons bg-white text-ember shadow-subtle">
                        <Icon className="h-4 w-4" aria-hidden="true" />
                      </span>
                      <span className="text-xs font-medium text-ash">{String(index + 1).padStart(2, '0')}</span>
                    </div>
                    <h3 className="mt-4 text-[15px] font-semibold leading-5 text-charcoal">{step.title}</h3>
                    <p className="mt-2 text-[13px] leading-5 text-graphite">{step.description}</p>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            {carePolicies.map((policy) => {
              const Icon = policy.icon;
              return (
                <article key={policy.title} className="rounded-cards-lg border border-stone-surface bg-white p-5" style={{ boxShadow: 'var(--shadow-subtle)' }}>
                  <Icon className="h-5 w-5 text-ember" aria-hidden="true" />
                  <h3 className="mt-4 text-[15px] font-semibold text-charcoal">{policy.title}</h3>
                  <p className="mt-2 text-[13px] leading-6 text-graphite">{policy.description}</p>
                </article>
              );
            })}
          </div>
        </div>
      </div>
    </CommerceSection>
  );
}
