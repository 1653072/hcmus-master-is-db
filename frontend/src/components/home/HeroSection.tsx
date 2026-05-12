'use client';

import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useState } from 'react';

const heroBanners = [
  {
    image: '/assets/banners/home-wide-book-campaign.png',
    eyebrow: 'Ưu đãi trong tuần',
    title: 'Mua sách mùa mới, nhận deal giao nhanh.',
    description: 'Khám phá bestseller, sách học tập và quà tặng đọc sách với giá rõ ràng ngay trong giỏ hàng.',
    href: '/books',
    cta: 'Xem kho sách',
  },
  {
    image: '/assets/banners/home-carousel-sale.png',
    eyebrow: 'Book fair online',
    title: 'Deal sách chọn lọc cho tủ sách mới.',
    description: 'Các đầu sách đang được quan tâm, dễ lọc theo danh mục và sẵn sàng thêm vào giỏ.',
    href: '/best-sellers',
    cta: 'Săn sách bán chạy',
  },
  {
    image: '/assets/banners/home-carousel-manga-study.png',
    eyebrow: 'Manga, thiếu nhi, luyện thi',
    title: 'Tìm nhanh đúng gu đọc hôm nay.',
    description: 'Từ giải trí đến học tập, các nhóm sách nổi bật được gom rõ để bạn duyệt nhanh hơn.',
    href: '/categories',
    cta: 'Duyệt danh mục',
  },
] as const;

export function HeroSection() {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActiveIndex((index) => (index + 1) % heroBanners.length);
    }, 5200);

    return () => window.clearInterval(timer);
  }, []);

  const goTo = (index: number) => setActiveIndex((index + heroBanners.length) % heroBanners.length);

  return (
    <section className="bg-canvas">
      <div className="mx-auto max-w-page px-4 py-6 sm:px-6 lg:px-10 lg:py-8 xl:px-24">
        <div className="relative overflow-hidden rounded-cards-lg bg-midnight shadow-card-lg">
          <div
            className="flex transition-transform duration-500 ease-out"
            style={{ transform: `translateX(-${activeIndex * 100}%)` }}
          >
            {heroBanners.map((banner) => (
              <Link
                key={banner.image}
                href={banner.href}
                className="group relative block min-h-[260px] w-full shrink-0 overflow-hidden text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember/40 sm:min-h-[320px] lg:min-h-[390px]"
              >
                <div
                  className="absolute inset-0 bg-cover bg-center transition duration-500 ease-out group-hover:scale-[1.015]"
                  style={{ backgroundImage: `url(${banner.image})` }}
                  aria-hidden="true"
                />
                <div className="absolute inset-0 bg-[linear-gradient(90deg,var(--surface-dark-shell)_0%,oklch(18.7%_0.014_58_/_0.76)_36%,oklch(18.7%_0.014_58_/_0.18)_76%)]" />
                <div className="relative flex min-h-[260px] max-w-[620px] flex-col justify-center px-5 py-8 sm:min-h-[320px] sm:px-8 lg:min-h-[390px] lg:px-10">
                  <p className="text-[12px] font-medium uppercase tracking-[0.18em] text-sunburst">{banner.eyebrow}</p>
                  <h1 className="mt-3 font-display text-[clamp(2.1rem,5vw,4.1rem)] font-semibold leading-[1.03] text-white">
                    {banner.title}
                  </h1>
                  <p className="mt-4 max-w-[480px] text-[15px] leading-6 text-white/78 sm:text-[16px]">
                    {banner.description}
                  </p>
                  <span className="mt-6 inline-flex h-11 w-fit items-center rounded-buttons bg-ember px-5 text-sm font-medium text-white transition group-hover:bg-coral-red">
                    {banner.cta}
                  </span>
                </div>
              </Link>
            ))}
          </div>

          <button
            type="button"
            onClick={() => goTo(activeIndex - 1)}
            className="absolute left-3 top-1/2 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-buttons bg-white/92 text-charcoal shadow-sm transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember/40 sm:inline-flex"
            aria-label="Banner trước"
          >
            <ChevronLeft className="h-5 w-5" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => goTo(activeIndex + 1)}
            className="absolute right-3 top-1/2 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-buttons bg-white/92 text-charcoal shadow-sm transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember/40 sm:inline-flex"
            aria-label="Banner tiếp theo"
          >
            <ChevronRight className="h-5 w-5" aria-hidden="true" />
          </button>

          <div className="absolute bottom-4 left-5 flex items-center gap-2 sm:left-8 lg:left-10">
            {heroBanners.map((banner, index) => (
              <button
                key={banner.image}
                type="button"
                onClick={() => goTo(index)}
                className={`h-2.5 rounded-full transition ${
                  activeIndex === index ? 'w-8 bg-sunburst' : 'w-2.5 bg-white/55 hover:bg-white/80'
                }`}
                aria-label={`Chuyển đến banner ${index + 1}`}
                aria-current={activeIndex === index ? 'true' : undefined}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
