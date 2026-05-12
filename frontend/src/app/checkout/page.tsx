'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { RouteShell } from '@/components/layout/RouteShell';
import { Button } from '@/components/ui/button';
import { addressesApi } from '@/lib/api/addresses';
import { ordersApi } from '@/lib/api/orders';
import { useCartStore } from '@/stores/cart.store';

function formatPrice(value: number) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(value);
}

export default function Page() {
  const router = useRouter();
  const checkoutItems = useCartStore((s) => s.checkoutItems);
  const checkoutSessionId = useCartStore((s) => s.checkoutSessionId);
  const clearCart = useCartStore((s) => s.clearCart);
  const [placingOrder, setPlacingOrder] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [delivery, setDelivery] = useState({
    receiver_name: '',
    phone: '',
    address_line: '',
    ward: '',
    district: '',
    city: '',
    note: '',
  });

  useEffect(() => {
    if (checkoutItems.length === 0) {
      router.push('/cart');
    }
  }, [checkoutItems, router]);

  const subtotal = useMemo(() => checkoutItems.reduce((acc, item) => acc + item.price * item.quantity, 0), [checkoutItems]);
  const shippingFee = subtotal > 0 ? 4 : 0;
  const grandTotal = subtotal + shippingFee;

  const updateDelivery = (key: keyof typeof delivery, value: string) => {
    setDelivery((current) => ({ ...current, [key]: value }));
  };

  const handlePlaceOrder = async () => {
    const receiverName = delivery.receiver_name.trim();
    const phone = delivery.phone.trim();
    const addressLine = delivery.address_line.trim();
    const ward = delivery.ward.trim();
    const district = delivery.district.trim();
    const city = delivery.city.trim();
    const note = delivery.note.trim();
    const hasShippingInfo = [receiverName, phone, addressLine, ward, district, city].some(Boolean);

    const nextErrors: Record<string, string> = {};
    if (hasShippingInfo && !receiverName) nextErrors.receiver_name = 'Vui lòng nhập tên người nhận.';
    if (hasShippingInfo && !phone) nextErrors.phone = 'Vui lòng nhập số điện thoại.';
    if (hasShippingInfo && phone && !/^[0-9+\s().-]{8,18}$/.test(phone)) nextErrors.phone = 'Số điện thoại chưa hợp lệ.';
    if (hasShippingInfo && !addressLine) nextErrors.address_line = 'Vui lòng nhập địa chỉ.';
    if (hasShippingInfo && !city) nextErrors.city = 'Vui lòng nhập tỉnh/thành phố.';
    setFieldErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      toast.error('Vui lòng kiểm tra thông tin giao hàng.');
      return;
    }

    try {
      setPlacingOrder(true);
      let addressID: string | undefined;
      if (hasShippingInfo) {
        const address = await addressesApi.create({
          receiver_name: receiverName,
          phone,
          address_line: addressLine,
          ward,
          district,
          city,
          is_default: false,
        });
        addressID = address.alias_id;
      }

      const order = await ordersApi.checkout({
        address_id: addressID,
        note: note || undefined,
        session_id: checkoutSessionId || undefined,
      });

      clearCart();
      toast.success('Đặt hàng thành công.');
      router.push(order?.alias_id ? `/orders/${order.alias_id}` : '/orders');
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Không thể đặt hàng');
    } finally {
      setPlacingOrder(false);
    }
  };

  if (checkoutItems.length === 0) {
    return null;
  }

  return (
    <RouteShell title="Thanh toán" subtitle="Nhập thông tin giao hàng, chọn cách thanh toán và xác nhận đơn sách.">
      <section className="mx-auto max-w-page px-6 pb-16 pt-0 lg:px-10 xl:px-24">
        <div className="grid gap-6 lg:grid-cols-[1fr_0.42fr]">
          <form className="space-y-4 rounded-cards-lg border border-stone-surface bg-white p-5" style={{ boxShadow: 'var(--shadow-sm)' }}>
            <div className="h-1.5 w-14 rounded-full bg-ember/20" aria-hidden="true" />
            <div className="grid gap-3 border-b border-stone-surface pb-4 sm:grid-cols-3">
              {['1. Giao hàng', '2. Thanh toán khi nhận', '3. Xác nhận'].map((step, index) => (
                <div key={step} className={`rounded-cards px-3 py-2 text-sm font-medium ${index === 0 ? 'bg-ember text-white' : 'bg-parchment text-graphite'}`}>
                  {step}
                </div>
              ))}
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-xs font-medium uppercase tracking-[0.24em] text-ash">Họ tên người nhận</span>
                <input
                  value={delivery.receiver_name}
                  onChange={(event) => updateDelivery('receiver_name', event.target.value)}
                  className="w-full rounded-full border border-stone-surface bg-parchment px-4 py-3 text-sm outline-none transition placeholder:text-smoke focus:border-ember focus:bg-white focus:ring-2 focus:ring-ember/20"
                  placeholder="Họ tên"
                />
                {fieldErrors.receiver_name ? <span className="mt-1 block text-xs font-semibold text-coral-red">{fieldErrors.receiver_name}</span> : null}
              </label>
              <label className="block">
                <span className="mb-2 block text-xs font-medium uppercase tracking-[0.24em] text-ash">Điện thoại</span>
                <input
                  value={delivery.phone}
                  onChange={(event) => updateDelivery('phone', event.target.value)}
                  className="w-full rounded-full border border-stone-surface bg-parchment px-4 py-3 text-sm outline-none transition placeholder:text-smoke focus:border-ember focus:bg-white focus:ring-2 focus:ring-ember/20"
                  placeholder="Số điện thoại"
                />
                {fieldErrors.phone ? <span className="mt-1 block text-xs font-semibold text-coral-red">{fieldErrors.phone}</span> : null}
              </label>
            </div>
            <label className="block">
              <span className="mb-2 block text-xs font-medium uppercase tracking-[0.24em] text-ash">Địa chỉ</span>
              <input
                value={delivery.address_line}
                onChange={(event) => updateDelivery('address_line', event.target.value)}
                className="w-full rounded-full border border-stone-surface bg-parchment px-4 py-3 text-sm outline-none transition placeholder:text-smoke focus:border-ember focus:bg-white focus:ring-2 focus:ring-ember/20"
                placeholder="Số nhà, tên đường"
              />
              {fieldErrors.address_line ? <span className="mt-1 block text-xs font-semibold text-coral-red">{fieldErrors.address_line}</span> : null}
            </label>
            <div className="grid gap-4 md:grid-cols-3">
              <label className="block">
                <span className="mb-2 block text-xs font-medium uppercase tracking-[0.24em] text-ash">Phường/Xã</span>
                <input
                  value={delivery.ward}
                  onChange={(event) => updateDelivery('ward', event.target.value)}
                  className="w-full rounded-full border border-stone-surface bg-parchment px-4 py-3 text-sm outline-none transition placeholder:text-smoke focus:border-ember focus:bg-white focus:ring-2 focus:ring-ember/20"
                  placeholder="Phường/Xã"
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-xs font-medium uppercase tracking-[0.24em] text-ash">Quận/Huyện</span>
                <input
                  value={delivery.district}
                  onChange={(event) => updateDelivery('district', event.target.value)}
                  className="w-full rounded-full border border-stone-surface bg-parchment px-4 py-3 text-sm outline-none transition placeholder:text-smoke focus:border-ember focus:bg-white focus:ring-2 focus:ring-ember/20"
                  placeholder="Quận/Huyện"
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-xs font-medium uppercase tracking-[0.24em] text-ash">Tỉnh/Thành phố</span>
                <input
                  value={delivery.city}
                  onChange={(event) => updateDelivery('city', event.target.value)}
                  className="w-full rounded-full border border-stone-surface bg-parchment px-4 py-3 text-sm outline-none transition placeholder:text-smoke focus:border-ember focus:bg-white focus:ring-2 focus:ring-ember/20"
                  placeholder="Tỉnh/Thành phố"
                />
                {fieldErrors.city ? <span className="mt-1 block text-xs font-semibold text-coral-red">{fieldErrors.city}</span> : null}
              </label>
            </div>
            <label className="block">
              <span className="mb-2 block text-xs font-medium uppercase tracking-[0.24em] text-ash">Ghi chú</span>
              <textarea
                value={delivery.note}
                onChange={(event) => updateDelivery('note', event.target.value)}
                className="min-h-32 w-full rounded-[22px] border border-stone-surface bg-parchment px-4 py-3 text-sm outline-none transition placeholder:text-smoke focus:border-ember focus:bg-white focus:ring-2 focus:ring-ember/20"
                placeholder="Ghi chú giao hàng"
              />
            </label>
            <div className="rounded-cards border border-stone-surface bg-parchment p-4 text-sm text-graphite">
              <p className="font-medium text-charcoal">Phương thức thanh toán</p>
              <p className="mt-1">Thanh toán khi nhận hàng. Các cổng thanh toán online có thể bổ sung sau.</p>
            </div>
          </form>

          <aside className="rounded-cards-lg border border-stone-surface bg-parchment p-5 h-fit" style={{ boxShadow: 'var(--shadow-sm)' }}>
            <div className="h-1.5 w-14 rounded-full bg-ember/20" aria-hidden="true" />
            <h2 className="mt-3 font-display text-[clamp(1.75rem,3vw,2.1rem)] leading-tight text-charcoal">Tóm tắt thanh toán</h2>
            
            <div className="mt-6 space-y-4 border-b border-stone-surface pb-4">
              {checkoutItems.map((item) => (
                <div key={item.book_id} className="flex justify-between text-sm">
                  <div className="min-w-0 flex-1 pr-4">
                    <span className="text-charcoal truncate block">{item.name}</span>
                    <span className="mt-1 block text-xs text-ash">Số lượng {item.quantity}</span>
                  </div>
                  <span className="text-graphite shrink-0 font-medium">{formatPrice(item.price * item.quantity)}</span>
                </div>
              ))}
            </div>

            <div className="mt-4 space-y-3 text-sm text-graphite">
              <div className="flex justify-between"><span>Tạm tính</span><span>{formatPrice(subtotal)}</span></div>
              <div className="flex justify-between"><span>Vận chuyển</span><span>{formatPrice(shippingFee)}</span></div>
              <div className="flex justify-between border-t border-stone-surface pt-3 font-medium text-charcoal"><span>Tổng</span><span>{formatPrice(grandTotal)}</span></div>
            </div>
            <Button className="mt-6 w-full" onClick={handlePlaceOrder} disabled={placingOrder}>
              {placingOrder ? 'Đang đặt hàng...' : 'Đặt hàng'}
            </Button>
          </aside>
        </div>
      </section>
    </RouteShell>
  );
}
