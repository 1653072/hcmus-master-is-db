'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useMemo, useState } from 'react';
import { Minus, Plus } from 'lucide-react';
import { toast } from 'sonner';

import { useRouter } from 'next/navigation';

import { RouteShell } from '@/components/layout/RouteShell';
import { Button } from '@/components/ui/button';
import { cartApi } from '@/lib/api/cart';
import type { CartItem } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';
import { useCartStore } from '@/stores/cart.store';

export default function Page() {
  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const setCheckoutItems = useCartStore((s) => s.setCheckoutItems);

  useEffect(() => {
    let mounted = true;

    async function loadCart() {
      try {
        setLoading(true);
        setError(null);
        const res = await cartApi.get();
        if (!mounted) return;
        setItems(res.items ?? []);
      } catch (err) {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : 'Không tải được giỏ hàng');
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadCart();
    return () => {
      mounted = false;
    };
  }, []);

  const updateQuantity = async (bookId: string, newQuantity: number) => {
    if (newQuantity < 1) {
      try {
        setUpdatingId(bookId);
        await cartApi.removeItem(bookId);
        setItems((prev) => prev.filter((i) => i.book_id !== bookId));
      } catch (err) {
        toast.error('Không thể xóa sách khỏi giỏ');
      } finally {
        setUpdatingId(null);
      }
      return;
    }

    try {
      setUpdatingId(bookId);
      await cartApi.updateItem(bookId, { quantity: newQuantity });
      setItems((prev) => prev.map((i) => (i.book_id === bookId ? { ...i, quantity: newQuantity } : i)));
    } catch (err) {
      toast.error('Không thể cập nhật số lượng');
    } finally {
      setUpdatingId(null);
    }
  };

  const subtotal = useMemo(() => items.reduce((acc, item) => acc + item.price * item.quantity, 0), [items]);
  const shipping = subtotal > 0 ? 4 : 0;
  const grandTotal = subtotal + shipping;

  const handleCheckout = () => {
    setCheckoutItems(items);
    router.push('/checkout');
  };

  return (
    <RouteShell title="Giỏ hàng" subtitle="Kiểm tra sách, số lượng, ưu đãi và phí giao hàng trước khi thanh toán.">
      <section className="mx-auto max-w-page px-6 pb-16 pt-10 lg:px-10 xl:px-24">
        <div className="grid gap-6 lg:grid-cols-[1fr_0.38fr]">
          <div className="space-y-4">
            {loading ? (
              <div className="rounded-cards-lg border border-stone-surface bg-white p-6 text-sm text-graphite" style={{ boxShadow: 'var(--shadow-sm)' }}>
                Đang tải giỏ hàng...
              </div>
            ) : error ? (
              <div className="rounded-cards-lg border border-coral-red/20 bg-coral-red/5 p-6 text-coral-red" style={{ boxShadow: 'var(--shadow-sm)' }}>
                <p className="font-medium">Không tải được giỏ hàng</p>
                <p className="mt-2 text-sm text-graphite">{error}</p>
              </div>
            ) : items.length === 0 ? (
              <div className="rounded-cards-lg border border-dashed border-stone-surface bg-parchment p-12 text-center text-sm text-graphite">
                Giỏ hàng đang trống.
              </div>
            ) : (
              items.map((item, index) => {
                const isUpdating = updatingId === item.book_id;
                return (
                  <article key={item.book_id} className={`rounded-cards-lg border border-ember/50 bg-white p-4 transition ${isUpdating ? 'opacity-50 pointer-events-none' : ''}`} style={{ boxShadow: 'var(--shadow-sm)' }}>
                    <div className="flex items-center gap-4">
                      <div className="relative flex h-20 w-14 shrink-0 items-center justify-center overflow-hidden rounded-cards bg-gradient-to-br from-parchment to-stone-surface font-display text-xl text-charcoal">
                        {item.image_url ? (
                          <Image src={item.image_url} alt={item.name} fill sizes="56px" unoptimized className="object-cover" />
                        ) : (
                          String(index + 1).padStart(2, '0')
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h2 className="truncate text-[1.08rem] font-semibold leading-tight text-charcoal">{item.name}</h2>
                        <p className="mt-1 text-xs font-semibold text-ash">Duoc dong goi rieng, san sang giao nhanh</p>
                        <div className="mt-2 flex items-center gap-2 w-fit rounded-full border border-stone-surface bg-parchment px-2 py-1">
                          <button type="button" onClick={() => updateQuantity(item.book_id, item.quantity - 1)} className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-graphite hover:bg-stone-surface transition-colors">
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="w-6 text-center text-sm font-medium text-charcoal">{item.quantity}</span>
                          <button type="button" onClick={() => updateQuantity(item.book_id, item.quantity + 1)} className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-graphite hover:bg-stone-surface transition-colors">
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-charcoal">{formatCurrency(item.price, '0 ₫')}</p>
                      </div>
                    </div>
                  </article>
                );
              })
            )}
          </div>

          <aside className="rounded-cards-lg border border-stone-surface bg-parchment p-5" style={{ boxShadow: 'var(--shadow-sm)' }}>
            <div className="h-1.5 w-14 rounded-full bg-ember/20" aria-hidden="true" />
            <h2 className="mt-3 font-display text-[clamp(1.75rem,3vw,2.1rem)] leading-tight text-charcoal">Tạm tính đơn hàng</h2>
            <p className="mt-2 text-xs leading-5 text-ash">Voucher và phí cuối cùng được xác nhận ở bước thanh toán.</p>
            <div className="mt-4 rounded-cards border border-ember/20 bg-white px-3 py-2 text-sm font-medium text-ember">
              Freeship từ 149K, áp dụng nếu đơn đủ điều kiện.
            </div>
            <div className="mt-4 space-y-3 text-sm text-graphite">
              <div className="flex justify-between"><span>Tạm tính</span><span>{formatCurrency(subtotal, '0 ₫')}</span></div>
              <div className="flex justify-between"><span>Vận chuyển</span><span>{formatCurrency(shipping, '0 ₫')}</span></div>
              <div className="flex justify-between border-t border-stone-surface pt-3 font-medium text-charcoal"><span>Tổng</span><span>{formatCurrency(grandTotal, '0 ₫')}</span></div>
            </div>
            <Button className="mt-6 w-full" onClick={handleCheckout} disabled={items.length === 0}>
              Thanh toán
            </Button>
          </aside>
        </div>
      </section>
    </RouteShell>
  );
}
