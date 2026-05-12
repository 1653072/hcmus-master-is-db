'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { cn } from '@/lib/utils';

const wideBanner = '/assets/banners/home-wide-book-campaign.png';
const leftRailBanner = '/assets/banners/side-left-book-deals.png';
const rightRailBanner = '/assets/banners/side-right-book-deals.png';

export function HomeWideBanner() {
  return (
    <section className="mx-auto max-w-page px-4 py-6 sm:px-6 lg:px-10 xl:px-24">
      <Link
        href="/books"
        className="group relative block min-h-[220px] overflow-hidden rounded-cards-lg bg-midnight text-white shadow-card-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember/40 md:min-h-[260px]"
      >
        <div
          className="absolute inset-0 bg-cover bg-center transition duration-300 ease-out group-hover:scale-[1.015]"
          style={{ backgroundImage: `url(${wideBanner})` }}
          aria-hidden="true"
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,var(--surface-dark-shell)_0%,oklch(18.7%_0.014_58_/_0.72)_34%,oklch(18.7%_0.014_58_/_0.08)_72%)]" />
        <div className="relative flex min-h-[220px] max-w-[560px] flex-col justify-center px-5 py-8 sm:px-8 md:min-h-[260px]">
          <p className="text-[12px] font-medium uppercase tracking-[0.18em] text-sunburst">Ưu đãi trong tuần</p>
          <h2 className="mt-3 font-display text-[clamp(2rem,4vw,3.25rem)] font-semibold leading-[1.04] text-white">
            Mua sách mùa mới, nhận deal giao nhanh.
          </h2>
          <p className="mt-4 max-w-md text-[15px] leading-6 text-white/78">
            Khám phá sách bán chạy, tủ sách học tập và quà tặng đọc sách với giá rõ ràng ngay trong giỏ hàng.
          </p>
          <span className="mt-6 inline-flex h-11 w-fit items-center rounded-buttons bg-ember px-5 text-sm font-medium text-white transition group-hover:bg-coral-red">
            Xem kho sách
          </span>
        </div>
      </Link>
    </section>
  );
}

export function SideAdRails() {
  const [footerVisible, setFooterVisible] = useState(false);

  useEffect(() => {
    const footer = document.getElementById('site-footer');
    if (!footer) return;

    const observer = new IntersectionObserver(
      ([entry]) => setFooterVisible(entry.isIntersecting),
      { rootMargin: '0px 0px -8% 0px', threshold: 0.01 },
    );

    observer.observe(footer);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      className={cn(
        'pointer-events-none fixed inset-x-0 top-[190px] z-20 hidden transition duration-200 ease-out min-[1780px]:block',
        footerVisible ? 'opacity-0' : 'opacity-100',
      )}
      aria-label="Khuyến mãi sách"
      aria-hidden={footerVisible}
    >
      <div className="relative mx-auto h-[min(430px,calc(100vh-250px))] max-w-[1580px]">
        <SideRail
          href="/best-sellers"
          image={leftRailBanner}
          align="left"
          eyebrow="Deal sách"
          title="Bestseller đang giảm"
          cta="Săn ngay"
        />
        <SideRail
          href="/books"
          image={rightRailBanner}
          align="right"
          eyebrow="Gợi ý mới"
          title="Tủ sách hợp gu đọc"
          cta="Khám phá"
        />
      </div>
    </div>
  );
}

function SideRail({
  href,
  image,
  align,
  eyebrow,
  title,
  cta,
}: {
  href: string;
  image: string;
  align: 'left' | 'right';
  eyebrow: string;
  title: string;
  cta: string;
}) {
  return (
    <Link
      href={href}
      tabIndex={-1}
      className={`pointer-events-auto absolute top-0 flex h-full w-[132px] overflow-hidden rounded-cards-lg border border-stone-surface bg-white p-2 shadow-sm transition duration-200 ease-out hover:-translate-y-0.5 hover:shadow-card-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember/40 ${
        align === 'left' ? 'left-0' : 'right-0'
      }`}
      style={{ boxShadow: 'var(--shadow-sm)' }}
    >
      <div className="relative flex h-full w-full flex-col overflow-hidden rounded-cards bg-parchment">
        <div className="relative z-10 bg-white/94 px-3 py-3">
          <p className="text-[10px] font-medium uppercase leading-4 tracking-[0.16em] text-ember">{eyebrow}</p>
          <h2 className="mt-1 text-[16px] font-semibold leading-[1.14] text-charcoal">{title}</h2>
        </div>
        <div
          className="min-h-0 flex-1 bg-cover bg-center"
          style={{ backgroundImage: `url(${image})` }}
          aria-hidden="true"
        />
        <span className="m-2 inline-flex min-h-9 items-center justify-center rounded-buttons bg-white px-2 text-center text-[12px] font-medium text-ember shadow-subtle">
          {cta}
        </span>
      </div>
    </Link>
  );
}
