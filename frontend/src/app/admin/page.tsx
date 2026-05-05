'use client';

import Link from 'next/link';
import { BookOpen, BarChart3, Package, Tag, Users } from 'lucide-react';

const sections = [
  { title: 'Books', desc: 'Manage catalog, pricing, and featured titles.', href: '/admin/books', icon: BookOpen },
  { title: 'Categories', desc: 'Organize collections and browsing paths.', href: '/admin/categories', icon: Tag },
  { title: 'Orders', desc: 'Track order status and fulfillment.', href: '/admin/orders', icon: Package },
  { title: 'Users', desc: 'Review customers and access levels.', href: '/admin/users', icon: Users },
  { title: 'Analytics', desc: 'Measure performance and demand.', href: '/admin/analytics', icon: BarChart3 },
];

export default function Page() {
  return (
    <div className="px-6 py-8 lg:px-10">
      <div className="mb-8">
        <div className="h-1.5 w-14 rounded-full bg-orange-200" aria-hidden="true" />
        <h1 className="mt-4 font-display text-[clamp(2rem,4vw,2.8rem)] leading-[0.98] tracking-[-0.03em] text-zinc-900">
          Admin Dashboard
        </h1>
        <p className="mt-3 max-w-xl text-sm leading-7 text-zinc-500">
          Manage catalog, users, orders, and analytics from one clear control center.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {sections.map((section) => {
          const Icon = section.icon;
          return (
            <Link
              key={section.title}
              href={section.href}
              className="group rounded-2xl border border-stone-200 bg-white/85 p-5 shadow-[0_6px_20px_rgba(68,53,33,0.05)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_32px_rgba(68,53,33,0.1)]"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-orange-500 transition-colors group-hover:bg-orange-500 group-hover:text-white">
                <Icon className="h-5 w-5" />
              </div>
              <h2 className="mt-4 font-display text-[1.2rem] leading-tight tracking-[-0.02em] text-zinc-900">
                {section.title}
              </h2>
              <p className="mt-2 text-sm leading-6 text-zinc-500">{section.desc}</p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
