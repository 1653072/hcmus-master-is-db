'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

import { Footer } from '@/components/layout/Footer';
import { Header } from '@/components/layout/Header';

interface RouteShellProps {
  title?: string;
  subtitle?: string;
  children: ReactNode;
}

function getBreadcrumbs(pathname: string) {
  const parts = pathname.split('/').filter(Boolean);
  if (parts.length === 0) return [{ label: 'Home', href: '/' }];
  const crumbs = [{ label: 'Home', href: '/' }];
  let current = '';
  for (const part of parts) {
    current += `/${part}`;
    crumbs.push({ label: part.replace(/-/g, ' '), href: current });
  }
  return crumbs;
}

function normalizeLabel(label: string) {
  return label.replace(/\b\w/g, (m) => m.toUpperCase());
}

export function RouteShell({ title, subtitle, children }: RouteShellProps) {
  const pathname = usePathname();
  const breadcrumbs = getBreadcrumbs(pathname);

  return (
    <main className="min-h-screen bg-stone-50 text-zinc-800">
      <Header />

      <section className="mx-auto max-w-[1280px] px-6 pt-8 lg:px-10 xl:px-24">
        <p className="text-sm text-zinc-500">
          {breadcrumbs.map((crumb, index) => (
            <span key={crumb.href}>
              {index > 0 ? ' / ' : ''}
              <Link href={crumb.href} className="transition hover:text-zinc-900">
                {normalizeLabel(crumb.label)}
              </Link>
            </span>
          ))}
        </p>
        {title ? <h1 className="mt-4 font-display text-[clamp(2.25rem,5vw,3.75rem)] leading-[0.98] tracking-[-0.03em] text-zinc-900">{title}</h1> : null}
        {subtitle ? <p className="mt-4 max-w-2xl text-[1.05rem] leading-8 text-zinc-600">{subtitle}</p> : null}
      </section>

      {children}

      <Footer />
    </main>
  );
}
