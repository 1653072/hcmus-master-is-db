'use client';

import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import {
  BookOpen,
  ChevronDown,
  Flame,
  Grid3X3,
  Heart,
  LayoutGrid,
  LogIn,
  LogOut,
  Menu,
  Search,
  ShoppingCart,
  Star,
  Tag,
  TrendingUp,
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

const navLinks = [
  { label: 'Books', href: '/books', icon: BookOpen },
  { label: 'Best Sellers', href: '/best-sellers', icon: Star },
  { label: 'Trending', href: '/most-viewed/daily', icon: TrendingUp },
] as const;

const megaMenuGroups = [
  {
    title: 'Categories',
    icon: Tag,
    items: [
      ['Psychology', '/books?category=Psychology'],
      ['Business', '/books?category=Business'],
      ['Communication', '/books?category=Communication'],
      ['Self help', '/books?category=Self%20help'],
      ['Creativity', '/books?category=Creativity'],
      ['Finance', '/books?category=Finance'],
    ],
  },
  {
    title: 'Authors',
    icon: UserRound,
    items: [
      ['James Clear', '/books?query=James%20Clear'],
      ['Morgan Housel', '/books?query=Morgan%20Housel'],
      ['Cal Newport', '/books?query=Cal%20Newport'],
      ['Rick Rubin', '/books?query=Rick%20Rubin'],
    ],
  },
  {
    title: 'Trending',
    icon: Flame,
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
      <header
        id="site-header"
        className="sticky top-0 z-50 border-b border-zinc-900/8 bg-stone-50/95 backdrop-blur-lg"
      >
        <div className="mx-auto grid max-w-[1280px] grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 px-6 py-3.5 lg:px-10 xl:px-24">

          {/* ---- Logo ---- */}
          <Link
            href="/"
            className="flex shrink-0 items-center gap-2.5 transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/40 focus-visible:ring-offset-2 focus-visible:ring-offset-stone-50"
            aria-label="Paper Haven home"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500 text-xs font-bold tracking-tight text-white shadow-[0_8px_20px_rgba(234,88,12,0.22)]">
              PH
            </span>
            <span className="hidden font-display text-xl font-bold leading-6 tracking-[-0.03em] text-zinc-900 sm:block">
              Paper Haven
            </span>
          </Link>

          {/* ---- Center: Search + Nav ---- */}
          <div className="flex min-w-0 items-center gap-2 lg:gap-3">
            {/* Search bar */}
            <form onSubmit={handleSearch} className="relative flex min-w-0 flex-1 items-center">
              <label className="flex min-w-0 flex-1 items-center gap-2.5 rounded-full border border-zinc-200 bg-white/90 px-3.5 py-2 shadow-sm transition-all focus-within:border-orange-300 focus-within:ring-2 focus-within:ring-orange-500/15">
                <Search className="h-[15px] w-[15px] shrink-0 text-zinc-400" aria-hidden="true" />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={handleSearchKeyDown}
                  placeholder="Search books, authors..."
                  className="min-w-0 flex-1 bg-transparent text-[13px] font-medium text-zinc-800 outline-none placeholder:text-zinc-400"
                />
              </label>
            </form>

            {/* Desktop nav links */}
            <nav className="hidden items-center gap-0.5 lg:flex" aria-label="Primary navigation">
              {navLinks.map(({ label, href, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-[13px] font-semibold transition-colors ${
                    isActive(href)
                      ? 'bg-orange-50 text-orange-700'
                      : 'text-zinc-600 hover:bg-stone-100 hover:text-zinc-900'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                  {label}
                </Link>
              ))}
            </nav>

            {/* Mega menu trigger (desktop) */}
            <div ref={megaRef} className="relative hidden lg:block">
              <button
                type="button"
                onClick={() => setMegaOpen((v) => !v)}
                className={`inline-flex min-h-[38px] items-center gap-1.5 rounded-lg px-3 text-[13px] font-semibold transition-colors ${
                  megaOpen
                    ? 'bg-zinc-900 text-white'
                    : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200 hover:text-zinc-900'
                }`}
                aria-expanded={megaOpen}
                aria-haspopup="menu"
                aria-label="Browse categories"
              >
                {megaOpen ? (
                  <X className="h-3.5 w-3.5" />
                ) : (
                  <Grid3X3 className="h-3.5 w-3.5" />
                )}
                <span>Browse</span>
                <ChevronDown
                  className={`h-3 w-3 transition-transform duration-200 ${megaOpen ? 'rotate-180' : ''}`}
                  aria-hidden="true"
                />
              </button>

              {/* Mega menu dropdown */}
              <div
                className={`absolute right-0 top-[calc(100%+8px)] w-[680px] origin-top-right rounded-2xl border border-stone-200/80 bg-white p-5 shadow-[0_20px_50px_rgba(68,53,33,0.12)] transition-all duration-200 ${
                  megaOpen
                    ? 'pointer-events-auto scale-100 opacity-100'
                    : 'pointer-events-none scale-[0.97] opacity-0'
                }`}
                role="menu"
              >
                <div className="grid gap-5 md:grid-cols-3">
                  {megaMenuGroups.map((group) => {
                    const GroupIcon = group.icon;
                    return (
                      <div key={group.title}>
                        <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-zinc-400">
                          <GroupIcon className="h-3 w-3" aria-hidden="true" />
                          {group.title}
                        </p>
                        <div className="mt-3 space-y-0.5">
                          {group.items.map(([label, href]) => (
                            <Link
                              key={label}
                              href={href}
                              onClick={() => setMegaOpen(false)}
                              className="block rounded-lg px-2.5 py-1.5 text-[13px] font-medium text-zinc-600 transition-colors hover:bg-stone-50 hover:text-zinc-900"
                              role="menuitem"
                            >
                              {label}
                            </Link>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* ---- Right actions ---- */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Wishlist (desktop only) */}
            <Link
              href="/books"
              className="hidden h-9 w-9 items-center justify-center rounded-lg text-zinc-500 transition-colors hover:bg-stone-100 hover:text-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/40 lg:inline-flex"
              aria-label="Wishlist"
            >
              <Heart className="h-[17px] w-[17px]" aria-hidden="true" />
            </Link>

            {/* Cart */}
            <Link
              href="/cart"
              className="relative inline-flex h-9 w-9 items-center justify-center rounded-lg text-zinc-500 transition-colors hover:bg-stone-100 hover:text-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/40"
              aria-label={`Cart${cartCount > 0 ? `, ${cartCount} items` : ''}`}
            >
              <ShoppingCart className="h-[17px] w-[17px]" aria-hidden="true" />
              {cartCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-orange-500 px-1 text-[10px] font-bold leading-none text-white shadow-sm">
                  {cartCount > 99 ? '99+' : cartCount}
                </span>
              )}
            </Link>

            {/* User menu (desktop) */}
            <div ref={userMenuRef} className="relative hidden lg:block">
              <button
                type="button"
                onClick={() => setUserMenuOpen((v) => !v)}
                className={`inline-flex h-9 items-center gap-1.5 rounded-lg px-2 text-[13px] font-medium transition-colors ${
                  userMenuOpen
                    ? 'bg-stone-100 text-zinc-900'
                    : 'text-zinc-500 hover:bg-stone-100 hover:text-zinc-800'
                }`}
                aria-expanded={userMenuOpen}
                aria-haspopup="menu"
                aria-label="User menu"
              >
                <User className="h-[17px] w-[17px]" aria-hidden="true" />
                {mounted && user && (
                  <span className="max-w-[100px] truncate text-[13px]">
                    {user.full_name.split(' ')[0]}
                  </span>
                )}
                <ChevronDown
                  className={`h-3 w-3 transition-transform duration-200 ${userMenuOpen ? 'rotate-180' : ''}`}
                  aria-hidden="true"
                />
              </button>

              {/* User dropdown */}
              <div
                className={`absolute right-0 top-[calc(100%+6px)] w-52 origin-top-right rounded-xl border border-stone-200/80 bg-white py-1.5 shadow-[0_12px_32px_rgba(68,53,33,0.1)] transition-all duration-200 ${
                  userMenuOpen
                    ? 'pointer-events-auto scale-100 opacity-100'
                    : 'pointer-events-none scale-[0.97] opacity-0'
                }`}
                role="menu"
              >
                {mounted && user ? (
                  <>
                    <div className="border-b border-stone-100 px-3.5 pb-2.5 pt-2">
                      <p className="truncate text-[13px] font-semibold text-zinc-800">{user.full_name}</p>
                      <p className="truncate text-[11px] text-zinc-400">{user.email}</p>
                    </div>
                    <Link
                      href="/profile"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-2 px-3.5 py-2 text-[13px] font-medium text-zinc-600 transition-colors hover:bg-stone-50 hover:text-zinc-900"
                      role="menuitem"
                    >
                      <UserRound className="h-3.5 w-3.5" aria-hidden="true" />
                      My Profile
                    </Link>
                    <Link
                      href="/orders"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-2 px-3.5 py-2 text-[13px] font-medium text-zinc-600 transition-colors hover:bg-stone-50 hover:text-zinc-900"
                      role="menuitem"
                    >
                      <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
                      Orders
                    </Link>
                    {user.role === 'admin' && (
                      <Link
                        href="/admin"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-2 px-3.5 py-2 text-[13px] font-medium text-zinc-600 transition-colors hover:bg-stone-50 hover:text-zinc-900"
                        role="menuitem"
                      >
                        <LayoutGrid className="h-3.5 w-3.5" aria-hidden="true" />
                        Admin Panel
                      </Link>
                    )}
                    <div className="my-1 border-t border-stone-100" />
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="flex w-full items-center gap-2 px-3.5 py-2 text-[13px] font-medium text-zinc-500 transition-colors hover:bg-rose-50 hover:text-rose-600"
                      role="menuitem"
                    >
                      <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
                      Sign out
                    </button>
                  </>
                ) : (
                  <>
                    <Link
                      href="/login"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-2 px-3.5 py-2 text-[13px] font-medium text-zinc-600 transition-colors hover:bg-stone-50 hover:text-zinc-900"
                      role="menuitem"
                    >
                      <LogIn className="h-3.5 w-3.5" aria-hidden="true" />
                      Sign in
                    </Link>
                    <Link
                      href="/register"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-2 px-3.5 py-2 text-[13px] font-medium text-zinc-600 transition-colors hover:bg-stone-50 hover:text-zinc-900"
                      role="menuitem"
                    >
                      <UserRound className="h-3.5 w-3.5" aria-hidden="true" />
                      Create account
                    </Link>
                  </>
                )}
              </div>
            </div>

            {/* Mobile menu button */}
            <button
              type="button"
              onClick={() => setMobileOpen((v) => !v)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-zinc-600 transition-colors hover:bg-stone-100 hover:text-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/40 lg:hidden"
              aria-expanded={mobileOpen}
              aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            >
              {mobileOpen ? (
                <X className="h-[18px] w-[18px]" />
              ) : (
                <Menu className="h-[18px] w-[18px]" />
              )}
            </button>
          </div>
        </div>
      </header>

      {/* ---- Mobile drawer ---- */}
      {/* Overlay */}
      <div
        className={`fixed inset-0 z-40 bg-zinc-950/40 backdrop-blur-sm transition-opacity duration-300 lg:hidden ${
          mobileOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={() => setMobileOpen(false)}
        aria-hidden="true"
      />

      {/* Drawer panel */}
      <div
        className={`fixed inset-y-0 right-0 z-50 flex w-full max-w-[320px] flex-col bg-stone-50 shadow-[-8px_0_32px_rgba(0,0,0,0.08)] transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] lg:hidden ${
          mobileOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        role="dialog"
        aria-modal="true"
        aria-label="Mobile navigation"
      >
        {/* Drawer header */}
        <div className="flex items-center justify-between border-b border-stone-200/60 px-5 py-3.5">
          <span className="font-display text-lg font-bold text-zinc-900">Menu</span>
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 transition-colors hover:bg-stone-100 hover:text-zinc-900"
            aria-label="Close menu"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Drawer content */}
        <nav className="flex-1 overflow-y-auto px-4 py-4" aria-label="Mobile navigation">
          {/* User info (mobile) */}
          {mounted && user && (
            <div className="mb-4 rounded-xl bg-white/80 px-4 py-3 shadow-sm">
              <p className="truncate text-sm font-semibold text-zinc-800">{user.full_name}</p>
              <p className="truncate text-xs text-zinc-400">{user.email}</p>
            </div>
          )}

          {/* Mobile search */}
          <form onSubmit={handleSearch} className="mb-4">
            <label className="flex items-center gap-2.5 rounded-xl border border-zinc-200 bg-white/90 px-3.5 py-2.5 shadow-sm focus-within:border-orange-300 focus-within:ring-2 focus-within:ring-orange-500/15">
              <Search className="h-4 w-4 shrink-0 text-zinc-400" aria-hidden="true" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search books..."
                className="min-w-0 flex-1 bg-transparent text-sm font-medium text-zinc-800 outline-none placeholder:text-zinc-400"
              />
            </label>
          </form>

          {/* Primary nav */}
          <div className="space-y-0.5">
            {navLinks.map(({ label, href, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors ${
                  isActive(href)
                    ? 'bg-orange-50 text-orange-700'
                    : 'text-zinc-700 hover:bg-stone-100'
                }`}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                {label}
              </Link>
            ))}
          </div>

          {/* Mega menu sections in mobile */}
          <div className="mt-5 space-y-4">
            {megaMenuGroups.map((group) => {
              const GroupIcon = group.icon;
              return (
                <div key={group.title}>
                  <p className="flex items-center gap-1.5 px-4 text-[11px] font-bold uppercase tracking-[0.14em] text-zinc-400">
                    <GroupIcon className="h-3 w-3" aria-hidden="true" />
                    {group.title}
                  </p>
                  <div className="mt-1.5 space-y-0.5">
                    {group.items.map(([label, href]) => (
                      <Link
                        key={label}
                        href={href}
                        className="block rounded-xl px-4 py-2 text-sm font-medium text-zinc-600 transition-colors hover:bg-stone-100 hover:text-zinc-900"
                      >
                        {label}
                      </Link>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </nav>

        {/* Drawer footer */}
        <div className="border-t border-stone-200/60 px-4 py-4 space-y-1.5">
          {mounted && user ? (
            <>
              <Link
                href="/profile"
                className="flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium text-zinc-600 transition-colors hover:bg-stone-100 hover:text-zinc-900"
              >
                <UserRound className="h-4 w-4" aria-hidden="true" />
                My Profile
              </Link>
              <Link
                href="/orders"
                className="flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium text-zinc-600 transition-colors hover:bg-stone-100 hover:text-zinc-900"
              >
                <BookOpen className="h-4 w-4" aria-hidden="true" />
                Orders
              </Link>
              {user.role === 'admin' && (
                <Link
                  href="/admin"
                  className="flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium text-zinc-600 transition-colors hover:bg-stone-100 hover:text-zinc-900"
                >
                  <LayoutGrid className="h-4 w-4" aria-hidden="true" />
                  Admin Panel
                </Link>
              )}
              <button
                type="button"
                onClick={handleLogout}
                className="flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium text-zinc-500 transition-colors hover:bg-rose-50 hover:text-rose-600"
              >
                <LogOut className="h-4 w-4" aria-hidden="true" />
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-semibold text-zinc-700 transition-colors hover:bg-stone-100"
              >
                <LogIn className="h-4 w-4" aria-hidden="true" />
                Sign in
              </Link>
              <Button className="w-full" asChild>
                <Link
                  href="/register"
                >
                  Create account
                </Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </>
  );
}
