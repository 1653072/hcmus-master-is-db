'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

import { SideAdRails } from '@/components/ads/PromoBanners';
import { Footer } from '@/components/layout/Footer';
import { Header } from '@/components/layout/Header';

interface RouteShellProps {
  title?: string;
  subtitle?: string;
  breadcrumbLabels?: Record<string, string | undefined>;
  children: ReactNode;
}

function getBreadcrumbs(pathname: string) {
  const parts = pathname.split('/').filter(Boolean);
  if (parts.length === 0) return [{ label: 'Trang chủ', href: '/' }];
  const crumbs = [{ label: 'Trang chủ', href: '/' }];
  let current = '';
  for (const part of parts) {
    current += `/${part}`;
    crumbs.push({ label: part.replace(/-/g, ' '), href: current });
  }
  return crumbs;
}

function looksLikeTechnicalId(label: string) {
  return /^[a-f0-9]{20,}$/i.test(label) || /^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(label);
}

function normalizeLabel(label: string) {
  const routeLabels: Record<string, string> = {
    authors: 'Tác giả',
    'best-sellers': 'Sách bán chạy',
    books: 'Sách',
    cart: 'Giỏ hàng',
    categories: 'Danh mục',
    checkout: 'Thanh toán',
    login: 'Đăng nhập',
    'most-viewed': 'Xem nhiều',
    daily: 'Hôm nay',
    '30days': '30 ngày',
    orders: 'Đơn hàng',
    profile: 'Hồ sơ',
    register: 'Đăng ký',
  };
  if (looksLikeTechnicalId(label)) return 'Chi tiết';
  return routeLabels[label] ?? label.replace(/-/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase());
}

export function RouteShell({ title, subtitle, breadcrumbLabels, children }: RouteShellProps) {
  const pathname = usePathname();
  const breadcrumbs = getBreadcrumbs(pathname);

  return (
    <main className="min-h-screen bg-canvas text-graphite">
      <Header />
      <SideAdRails />

      <section className="mx-auto max-w-page px-6 pt-8 lg:px-10 xl:px-24">
        <p className="text-[13px] tracking-[-0.17px] text-ash">
          {breadcrumbs.map((crumb, index) => {
            const isCurrent = index === breadcrumbs.length - 1;
            const label = breadcrumbLabels?.[crumb.href] ?? breadcrumbLabels?.[crumb.label] ?? normalizeLabel(crumb.label);

            return (
              <span key={crumb.href}>
                {index > 0 ? ' / ' : ''}
                {isCurrent ? (
                  <span className="text-graphite" aria-current="page">
                    {label}
                  </span>
                ) : (
                  <Link href={crumb.href} className="transition hover:text-charcoal">
                    {label}
                  </Link>
                )}
              </span>
            );
          })}
        </p>
        {title ? <h1 className="mt-4 font-display text-[clamp(2.25rem,5vw,3.75rem)] font-medium leading-[1.09] tracking-[-0.031em] text-charcoal">{title}</h1> : null}
        {subtitle ? <p className="mt-4 max-w-[560px] text-[17px] leading-[1.47] tracking-[-0.22px] text-graphite">{subtitle}</p> : null}
      </section>

      {children}

      <Footer />
    </main>
  );
}
