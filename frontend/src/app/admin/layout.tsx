'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import {
  BarChart3,
  BookOpen,
  ChevronLeft,
  LayoutGrid,
  Menu,
  Package,
  Tag,
  Users,
  X,
} from 'lucide-react';
import { useAuthStore } from '@/stores/auth.store';

/* ------------------------------------------------------------------ */
/*  Sidebar links                                                      */
/* ------------------------------------------------------------------ */

const sidebarLinks = [
  { label: 'Dashboard', href: '/admin', icon: LayoutGrid },
  { label: 'Books', href: '/admin/books', icon: BookOpen },
  { label: 'Categories', href: '/admin/categories', icon: Tag },
  { label: 'Orders', href: '/admin/orders', icon: Package },
  { label: 'Users', href: '/admin/users', icon: Users },
  { label: 'Analytics', href: '/admin/analytics', icon: BarChart3 },
] as const;

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function AdminLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);
  const [mounted, setMounted] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  /* Redirect non-admin users */
  useEffect(() => {
    if (mounted && (!user || user.role !== 'admin')) {
      router.replace('/');
    }
  }, [mounted, user, router]);

  /* Close sidebar on route change */
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  if (!mounted || !user || user.role !== 'admin') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-stone-50">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" />
      </div>
    );
  }

  function isActive(href: string) {
    if (href === '/admin') return pathname === '/admin';
    return pathname.startsWith(href);
  }

  return (
    <div className="flex min-h-screen bg-stone-50">
      {/* ---- Desktop Sidebar ---- */}
      <aside className="hidden w-[240px] shrink-0 border-r border-stone-200/80 bg-white/80 backdrop-blur-sm lg:flex lg:flex-col">
        {/* Logo */}
        <div className="flex h-[60px] items-center gap-2.5 border-b border-stone-100 px-5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500 text-[10px] font-bold text-white shadow-sm">PH</span>
          <span className="font-display text-base font-bold tracking-[-0.02em] text-zinc-900">Admin Panel</span>
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-0.5 px-3 py-4" aria-label="Admin navigation">
          {sidebarLinks.map(({ label, href, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-semibold transition-all duration-150 ${
                isActive(href)
                  ? 'bg-orange-50 text-orange-700 shadow-[0_1px_3px_rgba(234,88,12,0.08)]'
                  : 'text-zinc-500 hover:bg-stone-50 hover:text-zinc-800'
              }`}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              {label}
            </Link>
          ))}
        </nav>

        {/* Footer */}
        <div className="border-t border-stone-100 px-3 py-3">
          <Link
            href="/"
            className="flex items-center gap-2 rounded-xl px-3 py-2 text-[13px] font-medium text-zinc-400 transition-colors hover:bg-stone-50 hover:text-zinc-700"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            Back to store
          </Link>
        </div>
      </aside>

      {/* ---- Mobile Header ---- */}
      <div className="flex flex-1 flex-col">
        <header className="flex h-[56px] items-center justify-between border-b border-stone-200/80 bg-white/90 px-4 backdrop-blur-sm lg:hidden">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-orange-500 text-[9px] font-bold text-white">PH</span>
            <span className="font-display text-sm font-bold text-zinc-900">Admin</span>
          </div>
          <button
            type="button"
            onClick={() => setSidebarOpen((v) => !v)}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-zinc-600 transition-colors hover:bg-stone-100"
            aria-label="Toggle menu"
          >
            {sidebarOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </header>

        {/* Mobile Sidebar Overlay */}
        <div
          className={`fixed inset-0 z-40 bg-zinc-950/40 backdrop-blur-sm transition-opacity duration-200 lg:hidden ${
            sidebarOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
          }`}
          onClick={() => setSidebarOpen(false)}
        />

        {/* Mobile Sidebar Drawer */}
        <div
          className={`fixed inset-y-0 left-0 z-50 w-[260px] bg-white shadow-xl transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] lg:hidden ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <div className="flex h-[56px] items-center justify-between border-b border-stone-100 px-4">
            <span className="font-display text-sm font-bold text-zinc-900">Navigation</span>
            <button
              type="button"
              onClick={() => setSidebarOpen(false)}
              className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-zinc-500 hover:bg-stone-100"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <nav className="space-y-0.5 px-3 py-4" aria-label="Admin navigation mobile">
            {sidebarLinks.map(({ label, href, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${
                  isActive(href)
                    ? 'bg-orange-50 text-orange-700'
                    : 'text-zinc-500 hover:bg-stone-50 hover:text-zinc-800'
                }`}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                {label}
              </Link>
            ))}
          </nav>
          <div className="border-t border-stone-100 px-3 py-3">
            <Link href="/" className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-zinc-400 hover:text-zinc-700">
              <ChevronLeft className="h-3.5 w-3.5" /> Back to store
            </Link>
          </div>
        </div>

        {/* ---- Main Content ---- */}
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
