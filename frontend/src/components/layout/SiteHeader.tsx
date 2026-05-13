'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  BookOpen,
  Gift,
  LayoutGrid,
  LogIn,
  LogOut,
  Menu,
  PackageCheck,
  Search,
  ShieldCheck,
  ShoppingCart,
  User,
  UserRound,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';

import type { FeaturedBook } from '@/components/books/book-card';
import { booksApi } from '@/lib/api/books';
import { categoriesApi } from '@/lib/api/categories';
import { authApi } from '@/lib/api/auth';
import { toFeaturedBook } from '@/lib/books';
import { cn } from '@/lib/utils';
import type { Category } from '@/lib/types';
import { useAuthStore } from '@/stores/auth.store';
import { useCartStore } from '@/stores/cart.store';

const primaryLinks = [
  ['Tất cả sách', '/books'],
  ['Danh mục', '/categories'],
  ['Tác giả', '/authors'],
] as const;

const trendLinks = [
  ['Sách bán chạy', '/best-sellers'],
  ['Xem nhiều hôm nay', '/most-viewed/daily'],
  ['Top 30 ngày', '/most-viewed/30days'],
] as const;

const trustItems = [
  ['Freeship từ 149K', PackageCheck],
  ['Voucher mới mỗi ngày', Gift],
  ['Sách chính hãng', ShieldCheck],
] as const;

export function SiteHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const [megaOpen, setMegaOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchSuggestions, setSearchSuggestions] = useState<FeaturedBook[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [highlightedSuggestion, setHighlightedSuggestion] = useState(-1);
  const [mounted, setMounted] = useState(false);
  const [fetchedCategories, setFetchedCategories] = useState<Category[]>([]);
  const megaRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLFormElement>(null);

  const user = useAuthStore((s) => s.user);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const cartItems = useCartStore((s) => s.items);
  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (megaRef.current && !megaRef.current.contains(e.target as Node)) setMegaOpen(false);
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) setUserMenuOpen(false);
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setSearchOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  useEffect(() => {
    setMounted(true);
    categoriesApi.list({ page_size: 50 })
      .then((res) => {
        const cats = Array.isArray((res as any).data) ? (res as any).data : [];
        setFetchedCategories(Array.from(new Map(cats.map((cat: Category) => [cat.category_name, cat])).values()) as Category[]);
      })
      .catch(() => setFetchedCategories([]));
  }, []);

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

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileOpen]);

  useEffect(() => {
    const q = searchQuery.trim();
    setHighlightedSuggestion(-1);

    if (q.length < 2) {
      setSearchSuggestions([]);
      setSearchLoading(false);
      setSearchOpen(false);
      return;
    }

    let active = true;
    setSearchLoading(true);
    setSearchOpen(true);
    const timeout = window.setTimeout(async () => {
      try {
        const res = await booksApi.search({ page: 1, page_size: 5, search: q });
        const list = Array.isArray((res as any).data) ? ((res as any).data as unknown[]) : [];
        if (!active) return;
        setSearchSuggestions(list.map((book, index) => toFeaturedBook(book as any, index)));
        setSearchOpen(true);
      } catch {
        if (active) setSearchSuggestions([]);
      } finally {
        if (active) setSearchLoading(false);
      }
    }, 260);

    return () => {
      active = false;
      window.clearTimeout(timeout);
    };
  }, [searchQuery]);

  useEffect(() => {
    setMobileOpen(false);
    setMegaOpen(false);
    setUserMenuOpen(false);
    setSearchOpen(false);
    setHighlightedSuggestion(-1);
  }, [pathname]);

  const resetSearch = useCallback(() => {
    setSearchQuery('');
    setSearchSuggestions([]);
    setSearchOpen(false);
    setHighlightedSuggestion(-1);
    setMobileOpen(false);
  }, []);

  const handleSearch = useCallback(
    (e: FormEvent) => {
      e.preventDefault();
      const q = searchQuery.trim();
      if (!q) return;
      router.push(`/books?search=${encodeURIComponent(q)}`);
      resetSearch();
    },
    [resetSearch, router, searchQuery],
  );

  const handleSearchKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Escape') {
        setSearchOpen(false);
        setHighlightedSuggestion(-1);
        (e.target as HTMLInputElement).blur();
        return;
      }

      if (!searchOpen || searchSuggestions.length === 0) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setHighlightedSuggestion((current) => (current + 1) % searchSuggestions.length);
      }

      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setHighlightedSuggestion((current) => (current <= 0 ? searchSuggestions.length - 1 : current - 1));
      }

      if (e.key === 'Enter' && highlightedSuggestion >= 0) {
        const book = searchSuggestions[highlightedSuggestion];
        if (book?.id) {
          e.preventDefault();
          router.push(`/books/${book.id}`);
          resetSearch();
        }
      }
    },
    [highlightedSuggestion, resetSearch, router, searchOpen, searchSuggestions],
  );

  const handleLogout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // Local logout still clears the client session if the server token is already expired.
    }
    clearAuth();
    setUserMenuOpen(false);
    router.push('/');
  }, [clearAuth, router]);

  const categoryItems = fetchedCategories.slice(0, 10).map((cat) => [
    cat.category_name,
    `/books?category=${encodeURIComponent(cat.id)}`,
  ] as const);
  const isActive = (href: string) => pathname === href || (href !== '/' && pathname.startsWith(`${href}/`));

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-40 border-b border-stone-surface bg-canvas">
        <div className="bg-midnight text-white">
          <div className="mx-auto flex h-9 max-w-page items-center justify-between gap-4 px-4 text-[12px] font-medium sm:px-6 lg:px-10 xl:px-24">
            <div className="flex min-w-0 items-center gap-4 overflow-hidden">
              {trustItems.map(([label, Icon]) => (
                <span key={label} className="hidden items-center gap-1.5 whitespace-nowrap sm:inline-flex">
                  <Icon className="h-3.5 w-3.5 text-sunburst" aria-hidden="true" />
                  {label}
                </span>
              ))}
              <span className="truncate sm:hidden">Freeship từ 149K, voucher mới mỗi ngày</span>
            </div>
            <Link href="/books" className="shrink-0 text-sunburst transition hover:text-white">
              Săn deal hôm nay
            </Link>
          </div>
        </div>

        <div className="mx-auto flex min-h-[72px] max-w-page items-center gap-3 px-4 sm:px-6 lg:px-10 xl:px-24">
          <button
            type="button"
            onClick={() => setMobileOpen((v) => !v)}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-buttons text-charcoal transition hover:bg-parchment focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember/35 lg:hidden"
            aria-expanded={mobileOpen}
            aria-haspopup="menu"
            aria-label={mobileOpen ? 'Đóng menu' : 'Mở menu'}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>

          <Link href="/" className="flex shrink-0 items-center gap-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember/35" aria-label="Paper Haven">
            <span className="flex h-10 w-10 items-center justify-center rounded-buttons bg-ember text-[13px] font-bold text-white">
              PH
            </span>
            <span className="hidden text-[18px] font-semibold text-charcoal sm:block">Paper Haven</span>
          </Link>

          <div className="relative hidden lg:block" ref={megaRef}>
            <button
              type="button"
              onClick={() => setMegaOpen((v) => !v)}
              className="inline-flex h-11 items-center gap-2 rounded-buttons border border-stone-surface bg-white px-4 text-[14px] font-semibold text-charcoal transition hover:border-ember/40 hover:bg-parchment focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember/35"
              aria-expanded={megaOpen}
            >
              <LayoutGrid className="h-4 w-4" aria-hidden="true" />
              Danh mục
            </button>

            <div
              className={`absolute left-0 top-[calc(100%+12px)] w-[560px] origin-top-left rounded-cards-lg border border-stone-surface bg-white p-5 shadow-[0_24px_54px_-28px_rgba(36,33,30,0.35)] transition duration-200 ${
                megaOpen ? 'pointer-events-auto translate-y-0 opacity-100' : 'pointer-events-none -translate-y-1 opacity-0'
              }`}
            >
              <div className="grid gap-6 md:grid-cols-[1.15fr_0.85fr]">
                <div>
                  <p className="text-[12px] font-medium uppercase tracking-[0.18em] text-ash">Danh mục sách</p>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    {categoryItems.length === 0 ? (
                      <p className="col-span-2 rounded-cards bg-parchment p-3 text-sm text-ash">Chưa có danh mục.</p>
                    ) : categoryItems.map(([label, href]) => (
                      <Link key={label} href={href} onClick={() => setMegaOpen(false)} className="rounded-cards px-3 py-2 text-sm font-medium text-graphite transition hover:bg-parchment hover:text-ember">
                        {label}
                      </Link>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-[12px] font-medium uppercase tracking-[0.18em] text-ash">Đang hot</p>
                  <div className="mt-3 space-y-2">
                    {trendLinks.map(([label, href]) => (
                      <Link key={label} href={href} onClick={() => setMegaOpen(false)} className="flex items-center gap-2 rounded-cards px-3 py-2 text-sm font-medium text-graphite transition hover:bg-parchment hover:text-ember">
                        <BookOpen className="h-4 w-4 text-ember" aria-hidden="true" />
                        {label}
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <form ref={searchRef} onSubmit={handleSearch} className="relative min-w-0 flex-1">
            <label className="flex h-11 w-full items-center gap-3 rounded-buttons border border-stone-surface bg-white px-4 transition focus-within:border-ember/45 focus-within:ring-2 focus-within:ring-ember/15 hover:border-ember/30">
              <Search className="h-4 w-4 shrink-0 text-ash" aria-hidden="true" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => {
                  if (searchQuery.trim().length >= 2) setSearchOpen(true);
                }}
                onKeyDown={handleSearchKeyDown}
                placeholder="Tìm sách, tác giả, thể loại..."
                className="w-full bg-transparent text-[14px] font-medium text-charcoal outline-none placeholder:text-smoke"
                role="combobox"
                aria-autocomplete="list"
                aria-controls="site-search-suggestions"
                aria-expanded={searchOpen}
              />
            </label>
            {searchOpen && searchQuery.trim().length >= 2 ? (
              <div
                id="site-search-suggestions"
                className="absolute left-0 right-0 top-[calc(100%+10px)] z-50 overflow-hidden rounded-cards-lg border border-stone-surface bg-white p-2 shadow-card-lg"
              >
                <div className="px-2 pb-2 pt-1 text-[12px] font-medium uppercase tracking-[0.18em] text-ash">Gợi ý sách</div>
                {searchLoading ? (
                  <div className="space-y-2 p-2">
                    {Array.from({ length: 3 }).map((_, index) => (
                      <div key={index} className="flex items-center gap-3">
                        <span className="skeleton-shimmer h-14 w-10 rounded-cards bg-stone-surface" />
                        <span className="min-w-0 flex-1 space-y-2">
                          <span className="skeleton-shimmer block h-3 w-3/4 rounded-full bg-stone-surface" />
                          <span className="skeleton-shimmer block h-3 w-1/2 rounded-full bg-parchment" />
                        </span>
                      </div>
                    ))}
                  </div>
                ) : searchSuggestions.length > 0 ? (
                  <div className="space-y-1" role="listbox">
                    {searchSuggestions.map((book, index) => {
                      const coverStyle = {
                        backgroundImage: book.image.startsWith('linear-gradient') ? book.image : `url("${book.image}")`,
                      };

                      return (
                        <Link
                          key={book.id ?? book.title}
                          href={book.id ? `/books/${book.id}` : `/books?search=${encodeURIComponent(searchQuery.trim())}`}
                          onClick={resetSearch}
                          onMouseEnter={() => setHighlightedSuggestion(index)}
                          className={cn(
                            'flex items-center gap-3 rounded-cards p-2 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember/35',
                            highlightedSuggestion === index ? 'bg-parchment text-charcoal' : 'hover:bg-parchment',
                          )}
                          role="option"
                          aria-selected={highlightedSuggestion === index}
                        >
                          <span className="h-14 w-10 shrink-0 rounded-cards bg-parchment bg-cover bg-center" style={coverStyle} aria-hidden="true" />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[14px] font-semibold text-charcoal">{book.title}</span>
                            <span className="mt-1 block truncate text-[12px] font-medium text-ash">{book.author}</span>
                          </span>
                          <span className="shrink-0 text-[12px] font-semibold text-ember">{book.price}</span>
                        </Link>
                      );
                    })}
                  </div>
                ) : (
                  <p className="rounded-cards bg-parchment p-3 text-sm text-graphite">Chưa tìm thấy sách phù hợp.</p>
                )}
                <Link
                  href={`/books?search=${encodeURIComponent(searchQuery.trim())}`}
                  onClick={resetSearch}
                  className="mt-2 flex items-center justify-center rounded-cards border border-stone-surface px-3 py-2 text-[13px] font-semibold text-ember transition hover:bg-ember/5"
                >
                  Xem tất cả kết quả
                </Link>
              </div>
            ) : null}
          </form>

          <Link
            href="/cart"
            className="relative inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-buttons bg-white text-charcoal transition hover:bg-parchment focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember/35"
            aria-label={`Giỏ hàng${cartCount > 0 ? `, ${cartCount} sản phẩm` : ''}`}
          >
            <ShoppingCart className="h-5 w-5" aria-hidden="true" />
            {mounted && cartCount > 0 ? (
              <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-ember px-1 text-[10px] font-medium text-white">
                {cartCount > 99 ? '99+' : cartCount}
              </span>
            ) : null}
          </Link>

          <div ref={userMenuRef} className="relative hidden sm:block">
            <button
              type="button"
              onClick={() => setUserMenuOpen((v) => !v)}
              className="inline-flex h-11 items-center gap-2 rounded-buttons bg-white px-3 text-[14px] font-semibold text-charcoal transition hover:bg-parchment focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember/35"
              aria-expanded={userMenuOpen}
              aria-haspopup="menu"
              aria-label="Tài khoản"
            >
              <User className="h-4 w-4" aria-hidden="true" />
              {mounted && user ? 'Tài khoản' : 'Đăng nhập'}
            </button>

            <div
              className={`absolute right-0 top-[calc(100%+12px)] w-56 origin-top-right rounded-cards-lg border border-stone-surface bg-white py-1.5 shadow-[0_24px_54px_-28px_rgba(36,33,30,0.35)] transition duration-200 ${
                userMenuOpen ? 'pointer-events-auto translate-y-0 opacity-100' : 'pointer-events-none -translate-y-1 opacity-0'
              }`}
              role="menu"
            >
              {mounted && user ? (
                <>
                  <div className="border-b border-stone-surface px-3.5 pb-2.5 pt-2">
                    <p className="truncate text-[13px] font-medium text-charcoal">{user.full_name}</p>
                    <p className="truncate text-[12px] text-ash">{user.email}</p>
                  </div>
                  <Link href="/profile" onClick={() => setUserMenuOpen(false)} className="flex items-center gap-2 px-3.5 py-2 text-[13px] font-medium text-graphite transition hover:bg-parchment hover:text-ember" role="menuitem">
                    <UserRound className="h-4 w-4" aria-hidden="true" />
                    Hồ sơ
                  </Link>
                  <Link href="/orders" onClick={() => setUserMenuOpen(false)} className="flex items-center gap-2 px-3.5 py-2 text-[13px] font-medium text-graphite transition hover:bg-parchment hover:text-ember" role="menuitem">
                    <BookOpen className="h-4 w-4" aria-hidden="true" />
                    Đơn hàng
                  </Link>
                  {user.role === 'admin' ? (
                    <Link href="/admin" onClick={() => setUserMenuOpen(false)} className="flex items-center gap-2 px-3.5 py-2 text-[13px] font-medium text-graphite transition hover:bg-parchment hover:text-ember" role="menuitem">
                      <LayoutGrid className="h-4 w-4" aria-hidden="true" />
                      Quản trị
                    </Link>
                  ) : null}
                  <button type="button" onClick={handleLogout} className="flex w-full items-center gap-2 border-t border-stone-surface px-3.5 py-2 text-[13px] font-medium text-ash transition hover:bg-coral-red/5 hover:text-coral-red" role="menuitem">
                    <LogOut className="h-4 w-4" aria-hidden="true" />
                    Đăng xuất
                  </button>
                </>
              ) : (
                <Link href="/login" onClick={() => setUserMenuOpen(false)} className="flex items-center gap-2 px-3.5 py-2 text-[13px] font-medium text-graphite transition hover:bg-parchment hover:text-ember" role="menuitem">
                  <LogIn className="h-4 w-4" aria-hidden="true" />
                  Đăng nhập
                </Link>
              )}
            </div>
          </div>
        </div>

        <nav className="hidden border-t border-stone-surface/80 bg-white lg:block" aria-label="Điều hướng chính">
          <div className="mx-auto flex h-10 max-w-page items-center gap-1 px-10 text-[13px] font-medium text-graphite xl:px-24">
            {primaryLinks.map(([label, href]) => (
              <Link
                key={label}
                href={href}
                className={cn(
                  'rounded-buttons px-3 py-1.5 transition hover:bg-parchment hover:text-ember',
                  isActive(href) ? 'bg-parchment text-ember' : 'text-graphite',
                )}
                aria-current={isActive(href) ? 'page' : undefined}
              >
                {label}
              </Link>
            ))}
            <span className="mx-2 h-4 w-px bg-stone-surface" aria-hidden="true" />
            {trendLinks.map(([label, href]) => (
              <Link
                key={label}
                href={href}
                className={cn(
                  'rounded-buttons px-3 py-1.5 transition hover:bg-parchment hover:text-ember',
                  isActive(href) ? 'bg-parchment text-ember' : 'text-graphite',
                )}
                aria-current={isActive(href) ? 'page' : undefined}
              >
                {label}
              </Link>
            ))}
          </div>
        </nav>
      </header>
      <div className="h-[117px] lg:h-[157px]" aria-hidden="true" />

      <div
        className={`fixed inset-x-4 top-[124px] z-50 origin-top rounded-cards-lg border border-stone-surface bg-white p-3 shadow-[0_24px_54px_-28px_rgba(36,33,30,0.35)] transition duration-200 lg:hidden ${
          mobileOpen ? 'pointer-events-auto translate-y-0 opacity-100' : 'pointer-events-none -translate-y-2 opacity-0'
        }`}
        role="menu"
        aria-label="Menu di động"
      >
        <div className="grid gap-2">
          <p className="px-2 pt-1 text-[12px] font-medium uppercase tracking-[0.18em] text-ash">Khám phá</p>
          <div className="grid grid-cols-2 gap-2">
            {primaryLinks.map(([label, href]) => (
              <Link
                key={label}
                href={href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  'rounded-cards px-3 py-2 text-sm font-medium transition',
                  isActive(href) ? 'bg-ember text-white' : 'bg-parchment text-charcoal',
                )}
                aria-current={isActive(href) ? 'page' : undefined}
              >
                {label}
              </Link>
            ))}
          </div>
          <p className="px-2 pt-2 text-[12px] font-medium uppercase tracking-[0.18em] text-ash">Danh mục nổi bật</p>
          <div className="grid grid-cols-2 gap-2">
            {categoryItems.slice(0, 8).map(([label, href]) => (
              <Link key={label} href={href} onClick={() => setMobileOpen(false)} className="rounded-cards bg-parchment px-3 py-2 text-sm font-medium text-charcoal">
                {label}
              </Link>
            ))}
          </div>
          <div className="my-1 border-t border-stone-surface" />
          <p className="px-2 text-[12px] font-medium uppercase tracking-[0.18em] text-ash">Xếp hạng</p>
          {trendLinks.map(([label, href]) => (
            <Link
              key={label}
              href={href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                'flex items-center gap-2 rounded-cards px-3 py-2 text-sm font-medium transition hover:bg-parchment hover:text-ember',
                isActive(href) ? 'bg-parchment text-ember' : 'text-graphite',
              )}
              role="menuitem"
              aria-current={isActive(href) ? 'page' : undefined}
            >
              <BookOpen className="h-4 w-4 text-ember" aria-hidden="true" />
              {label}
            </Link>
          ))}
          <div className="my-1 border-t border-stone-surface" />
          <Link href="/cart" onClick={() => setMobileOpen(false)} className="rounded-cards px-3 py-2 text-sm font-medium text-graphite">Giỏ hàng</Link>
          {mounted && user ? (
            <>
              <Link href="/profile" onClick={() => setMobileOpen(false)} className="rounded-cards px-3 py-2 text-sm font-medium text-graphite">Hồ sơ</Link>
              <Link href="/orders" onClick={() => setMobileOpen(false)} className="rounded-cards px-3 py-2 text-sm font-medium text-graphite">Đơn hàng</Link>
              <button type="button" onClick={handleLogout} className="rounded-cards px-3 py-2 text-left text-sm font-medium text-coral-red">Đăng xuất</button>
            </>
          ) : (
            <Link href="/login" onClick={() => setMobileOpen(false)} className="rounded-cards px-3 py-2 text-sm font-medium text-graphite">Đăng nhập</Link>
          )}
        </div>
      </div>
    </>
  );
}
