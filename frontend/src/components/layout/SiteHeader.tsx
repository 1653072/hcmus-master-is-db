'use client';

import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import {
  BookOpen,
  LayoutGrid,
  LogIn,
  LogOut,
  Menu,
  Search,
  ShoppingCart,
  User,
  UserRound,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { useAuthStore } from '@/stores/auth.store';
import { useCartStore } from '@/stores/cart.store';
import { Button } from '@/components/ui/button';

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */

const categoryGroups = [
  {
    title: 'Browse categories',
    icon: User,
    items: [
      ['Psychology', '/books?category=Psychology'],
      ['Business', '/books?category=Business'],
      ['Communication', '/books?category=Communication'],
      ['Self help', '/books?category=Self%20help'],
      ['Creativity', '/books?category=Creativity'],
      ['Finance', '/books?category=Finance'],
      ['Productivity', '/books?category=Productivity'],
      ['Leadership', '/books?category=Leadership'],
      ['Design', '/books?category=Design'],
      ['Marketing', '/books?category=Marketing'],
      ['Fiction', '/books?category=Fiction'],
      ['Technology', '/books?category=Technology'],
    ],
  },
  {
    title: 'Trending now',
    icon: ShoppingCart,
    items: [
      ['Best sellers', '/best-sellers'],
      ['Most viewed today', '/most-viewed/daily'],
      ['Most viewed 30 days', '/most-viewed/30days'],
      ['New arrivals', '/books'],
    ],
  },
] as const;

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function SiteHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const [megaOpen, setMegaOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  const megaRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const user = useAuthStore((s) => s.user);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const cartItems = useCartStore((s) => s.items);
  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  /* Close mega menu on click outside */
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (megaRef.current && !megaRef.current.contains(e.target as Node)) {
        setMegaOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  /* Close mega menu on Escape */
  useEffect(() => {
    function handleKeyDown(e: globalThis.KeyboardEvent) {
      if (e.key === 'Escape') {
        setMegaOpen(false);
        setMobileOpen(false);
        setUserMenuOpen(false);
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  /* Lock body scroll when mobile menu is open */
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  /* Close mobile menu on route change */
  useEffect(() => {
    setMobileOpen(false);
    setMegaOpen(false);
    setUserMenuOpen(false);
  }, [pathname]);

  const handleSearch = useCallback(
    (e: FormEvent) => {
      e.preventDefault();
      const q = searchQuery.trim();
      if (q) {
        router.push(`/search?q=${encodeURIComponent(q)}`);
        setSearchQuery('');
        setMobileOpen(false);
      }
    },
    [searchQuery, router],
  );

  const handleSearchKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Escape') {
        (e.target as HTMLInputElement).blur();
      }
    },
    [],
  );

  const handleLogout = useCallback(() => {
    clearAuth();
    setUserMenuOpen(false);
    router.push('/');
  }, [clearAuth, router]);

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(href + '/');
  }

  return (
    <>
      {/* ── Navigation Bar: bg #fbfaf9, height ~64px, subtle bottom outline ── */}
      <header
        id="site-header"
        className="sticky top-0 z-50 bg-canvas/95 backdrop-blur-lg"
        style={{ boxShadow: 'rgba(0, 0, 0, 0.04) 0px 0px 0px 1px' }}
      >
        <div className="mx-auto grid h-16 max-w-page grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 px-6 lg:px-10 xl:px-24">

          {/* ── Logo: wordmark left in charcoal ── */}
          <Link
            href="/"
            className="flex shrink-0 items-center gap-2.5 transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember/40 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
            aria-label="Paper Haven home"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-cards bg-midnight text-xs font-bold tracking-tight text-white">
              PH
            </span>
            <span className="hidden font-display text-[15px] font-medium tracking-[-0.2px] text-charcoal sm:block">
              Paper Haven
            </span>
          </Link>

          {/* ── Center: Search + Menu ── */}
          <div className="relative flex min-w-0 flex-1 items-center gap-2 lg:gap-3">
            <button
              type="button"
              onClick={() => setMobileOpen((v) => !v)}
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-cards text-graphite transition-colors hover:bg-parchment hover:text-charcoal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember/40"
              aria-expanded={mobileOpen}
              aria-haspopup="menu"
              aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            >
              {mobileOpen ? <X className="h-[18px] w-[18px]" /> : <Menu className="h-[18px] w-[18px]" />}
            </button>
            <form onSubmit={handleSearch} className="relative flex min-w-0 flex-1 items-center">
              <label className="flex min-w-0 flex-1 items-center gap-2.5 rounded-inputs border border-stone-surface bg-white px-4 py-2.5 transition-all focus-within:border-charcoal/30 focus-within:ring-2 focus-within:ring-charcoal/10">
                <Search className="h-[15px] w-[15px] shrink-0 text-ash" aria-hidden="true" />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={handleSearchKeyDown}
                  placeholder="Search books, authors..."
                  className="min-w-0 flex-1 bg-transparent text-[13px] font-medium tracking-[-0.17px] text-charcoal outline-none placeholder:text-smoke"
                />
              </label>
            </form>
          </div>

          {/* ── Right actions ── */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <Link
              href="/cart"
              className="relative inline-flex h-9 w-9 items-center justify-center rounded-cards text-ash transition-colors hover:bg-parchment hover:text-charcoal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember/40"
              aria-label={`Cart${cartCount > 0 ? `, ${cartCount} items` : ''}`}
            >
              <ShoppingCart className="h-[17px] w-[17px]" aria-hidden="true" />
              {cartCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-ember px-1 text-[10px] font-bold leading-none text-white">
                  {cartCount > 99 ? '99+' : cartCount}
                </span>
              )}
            </Link>

            <div ref={userMenuRef} className="relative">
              <button
                type="button"
                onClick={() => setUserMenuOpen((v) => !v)}
                className="inline-flex h-9 items-center rounded-pill px-3 text-[14px] font-medium tracking-[-0.18px] text-graphite transition-colors hover:bg-parchment hover:text-charcoal hover:shadow-[var(--shadow-subtle)] active:translate-y-px"
                aria-expanded={userMenuOpen}
                aria-haspopup="menu"
                aria-label="User menu"
              >
                <User className="h-[17px] w-[17px]" aria-hidden="true" />
              </button>

              <div
                className={`absolute right-0 top-[calc(100%+6px)] w-52 origin-top-right rounded-cards bg-white py-1.5 transition-all duration-200 ${
                  userMenuOpen ? 'pointer-events-auto scale-100 opacity-100' : 'pointer-events-none scale-[0.97] opacity-0'
                }`}
                style={{ boxShadow: '#f2f0ed 0px 0px 0px 1px inset, rgba(0, 0, 0, 0.04) 0px 1px 6px 0px, rgba(0, 0, 0, 0.05) 0px 0px 24px 0px' }}
                role="menu"
              >
                {mounted && user ? (
                  <>
                    <div className="border-b border-stone-surface px-3.5 pb-2.5 pt-2">
                      <p className="truncate text-[13px] font-semibold text-charcoal">{user.full_name}</p>
                      <p className="truncate text-[11px] text-ash">{user.email}</p>
                    </div>
                    <Link
                      href="/profile"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-2 px-3.5 py-2 text-[13px] font-medium text-graphite transition-colors hover:bg-parchment hover:text-charcoal"
                      role="menuitem"
                    >
                      <UserRound className="h-3.5 w-3.5" aria-hidden="true" />
                      My Profile
                    </Link>
                    <Link
                      href="/orders"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-2 px-3.5 py-2 text-[13px] font-medium text-graphite transition-colors hover:bg-parchment hover:text-charcoal"
                      role="menuitem"
                    >
                      <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
                      My Orders
                    </Link>
                    <div className="my-1 border-t border-stone-surface" />
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="flex w-full items-center gap-2 px-3.5 py-2 text-[13px] font-medium text-ash transition-colors hover:bg-coral-red/5 hover:text-coral-red"
                      role="menuitem"
                    >
                      <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
                      Sign out
                    </button>
                  </>
                ) : (
                  <Link
                    href="/login"
                    onClick={() => setUserMenuOpen(false)}
                    className="flex items-center gap-2 px-3.5 py-2 text-[13px] font-medium text-graphite transition-colors hover:bg-parchment hover:text-charcoal"
                    role="menuitem"
                  >
                    <LogIn className="h-3.5 w-3.5" aria-hidden="true" />
                    Sign in
                  </Link>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setMobileOpen((v) => !v)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-cards text-graphite transition-colors hover:bg-parchment hover:text-charcoal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember/40 lg:hidden"
              aria-expanded={mobileOpen}
              aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            >
              <Menu className="h-[18px] w-[18px]" />
            </button>
          </div>
        </div>
      </header>

      <div
        className={`absolute left-6 right-6 top-16 z-50 origin-top rounded-cards-lg border border-stone-surface bg-white p-2 shadow-[0_18px_40px_rgba(0,0,0,0.08)] transition-all duration-200 ${
          mobileOpen ? 'pointer-events-auto scale-100 opacity-100' : 'pointer-events-none scale-[0.97] opacity-0'
        }`}
        role="menu"
        aria-label="Mobile navigation menu"
      >
        <div className="space-y-1">
          <Link
            href="/books"
            onClick={() => setMobileOpen(false)}
            className="flex items-center gap-2 rounded-cards px-3 py-2 text-[14px] font-medium text-graphite transition-colors hover:bg-parchment hover:text-charcoal"
            role="menuitem"
          >
            <User className="h-3.5 w-3.5 text-ember" aria-hidden="true" />
            Browse books
          </Link>
          <Link
            href="/best-sellers"
            onClick={() => setMobileOpen(false)}
            className="flex items-center gap-2 rounded-cards px-3 py-2 text-[14px] font-medium text-graphite transition-colors hover:bg-parchment hover:text-charcoal"
            role="menuitem"
          >
            <ShoppingCart className="h-3.5 w-3.5 text-ember" aria-hidden="true" />
            Best sellers
          </Link>
          <Link
            href="/most-viewed/daily"
            onClick={() => setMobileOpen(false)}
            className="flex items-center gap-2 rounded-cards px-3 py-2 text-[14px] font-medium text-graphite transition-colors hover:bg-parchment hover:text-charcoal"
            role="menuitem"
          >
            <ShoppingCart className="h-3.5 w-3.5 text-ember" aria-hidden="true" />
            Trending today
          </Link>
          <div className="my-1 border-t border-stone-surface" />
          {mounted && user ? (
            <>
              <Link
                href="/profile"
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-2 rounded-cards px-3 py-2 text-[14px] font-medium text-graphite transition-colors hover:bg-parchment hover:text-charcoal"
                role="menuitem"
              >
                <UserRound className="h-3.5 w-3.5" aria-hidden="true" />
                My Profile
              </Link>
              <Link
                href="/orders"
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-2 rounded-cards px-3 py-2 text-[14px] font-medium text-graphite transition-colors hover:bg-parchment hover:text-charcoal"
                role="menuitem"
              >
                <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
                My Orders
              </Link>
              {user.role === 'admin' && (
                <Link
                  href="/admin"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-2 rounded-cards px-3 py-2 text-[14px] font-medium text-graphite transition-colors hover:bg-parchment hover:text-charcoal"
                  role="menuitem"
                >
                  <LayoutGrid className="h-3.5 w-3.5" aria-hidden="true" />
                  Admin Panel
                </Link>
              )}
              <button
                type="button"
                onClick={() => {
                  handleLogout();
                  setMobileOpen(false);
                }}
                className="flex w-full items-center gap-2 rounded-cards px-3 py-2 text-[14px] font-medium text-ash transition-colors hover:bg-coral-red/5 hover:text-coral-red"
                role="menuitem"
              >
                <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
                Sign out
              </button>
            </>
          ) : (
            <Link
              href="/login"
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-2 rounded-cards px-3 py-2 text-[14px] font-medium text-graphite transition-colors hover:bg-parchment hover:text-charcoal"
              role="menuitem"
            >
              <LogIn className="h-3.5 w-3.5" aria-hidden="true" />
              Sign in
            </Link>
          )}
        </div>
      </div>
    </>
  );
}
