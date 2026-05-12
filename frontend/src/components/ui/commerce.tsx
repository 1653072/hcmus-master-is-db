import Link from 'next/link';
import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

export function CommerceSection({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn('mx-auto max-w-page px-4 py-12 sm:px-6 lg:px-10 xl:px-24', className)}>
      {children}
    </section>
  );
}

export function CommercePanel({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('rounded-cards-lg border border-stone-surface bg-white p-5 shadow-sm', className)} style={{ boxShadow: 'var(--shadow-sm)' }}>
      {children}
    </div>
  );
}

export function ProductGrid({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4', className)}>
      {children}
    </div>
  );
}

export function CommerceState({
  title,
  message,
  actionHref,
  actionLabel,
  tone = 'neutral',
}: {
  title: string;
  message?: string;
  actionHref?: string;
  actionLabel?: string;
  tone?: 'neutral' | 'error';
}) {
  const isError = tone === 'error';
  return (
    <div
      className={cn(
        'rounded-cards-lg border p-6 text-sm',
        isError ? 'border-coral-red/25 bg-coral-red/5 text-coral-red' : 'border-dashed border-stone-surface bg-parchment text-graphite',
      )}
      style={{ boxShadow: isError ? 'var(--shadow-sm)' : undefined }}
    >
      <p className={cn('font-medium', isError ? 'text-coral-red' : 'text-charcoal')}>{title}</p>
      {message ? <p className="mt-2 leading-6 text-graphite">{message}</p> : null}
      {actionHref && actionLabel ? (
        <Link
          href={actionHref}
          className="mt-5 inline-flex min-h-10 items-center rounded-buttons bg-ember px-4 text-sm font-medium text-white transition hover:bg-coral-red focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember/35"
        >
          {actionLabel}
        </Link>
      ) : null}
    </div>
  );
}

export function CommerceSkeletonGrid({ count = 8 }: { count?: number }) {
  return (
    <ProductGrid>
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="rounded-cards-lg bg-white p-4" style={{ boxShadow: 'var(--shadow-sm)' }}>
          <div className="skeleton-shimmer h-[220px] rounded-cards bg-stone-surface/70" />
          <div className="mt-4 h-4 w-3/4 rounded-full bg-stone-surface/70" />
          <div className="mt-2 h-3 w-1/2 rounded-full bg-stone-surface/70" />
        </div>
      ))}
    </ProductGrid>
  );
}
