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
    search: 'Tìm kiếm',
  };
  return routeLabels[label] ?? label.replace(/-/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase());
}

export function RouteShell({ title, subtitle, children }: RouteShellProps) {
  const pathname = usePathname();
  const breadcrumbs = getBreadcrumbs(pathname);

  return (
    <main className="min-h-screen bg-canvas text-graphite">
      <Header />
      <SideAdRails />

      <section className="mx-auto max-w-page px-6 pt-8 lg:px-10 xl:px-24">
        <p className="text-[13px] tracking-[-0.17px] text-ash">
          {breadcrumbs.map((crumb, index) => (
            <span key={crumb.href}>
              {index > 0 ? ' / ' : ''}
              <Link href={crumb.href} className="transition hover:text-charcoal">
                {normalizeLabel(crumb.label)}
              </Link>
            </span>
          ))}
        </p>
        {title ? <h1 className="mt-4 font-display text-[clamp(2.25rem,5vw,3.75rem)] font-medium leading-[1.09] tracking-[-0.031em] text-charcoal">{title}</h1> : null}
        {subtitle ? <p className="mt-4 max-w-[560px] text-[17px] leading-[1.47] tracking-[-0.22px] text-graphite">{subtitle}</p> : null}
      </section>

      {children}

      <Footer />
    </main>
  );
}
