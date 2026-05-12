'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { RouteShell } from '@/components/layout/RouteShell';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/stores/auth.store';
import { useRouter } from 'next/navigation';
import { authApi } from '@/lib/api/auth';
import { ordersApi } from '@/lib/api/orders';
import { addressesApi } from '@/lib/api/addresses';
import type { UserInfo } from '@/lib/types';
import { CommerceSection } from '@/components/ui/commerce';

export default function Page() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);
  const setAuth = useAuthStore((s) => s.setAuth);
  const [mounted, setMounted] = useState(false);
  const [profile, setProfile] = useState<UserInfo | null>(user);
  const [fullName, setFullName] = useState(user?.full_name ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [orderCount, setOrderCount] = useState<number | null>(null);
  const [addressCount, setAddressCount] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !user) {
      router.push('/login');
    }
  }, [mounted, user, router]);

  useEffect(() => {
    if (!mounted || !user) return;
    let active = true;
    const currentUser = user;

    async function loadProfile() {
      if (currentUser.role !== 'user') {
        setProfile(currentUser);
        setFullName(currentUser.full_name);
        setPhone(currentUser.phone || '');
        return;
      }

      try {
        const [profileData, ordersData, addressesData] = await Promise.all([
          authApi.me(),
          ordersApi.history().catch(() => null),
          addressesApi.list().catch(() => []),
        ]);
        if (!active) return;
        setProfile(profileData);
        setFullName(profileData.full_name);
        setPhone(profileData.phone || '');
        setOrderCount(Number((ordersData as any)?.total ?? 0));
        setAddressCount(Array.isArray(addressesData) ? addressesData.length : 0);
        if (token) setAuth(token, profileData);
      } catch {
        toast.error('Không tải được hồ sơ');
      }
    }

    loadProfile();
    return () => {
      active = false;
    };
  }, [mounted, setAuth, token, user]);

  const handleSave = async () => {
    if (!profile || profile.role !== 'user') return;
    try {
      setSaving(true);
      const updated = await authApi.updateProfile({ full_name: fullName.trim(), phone: phone.trim() });
      setProfile(updated);
      if (token) setAuth(token, updated);
      toast.success('Đã cập nhật hồ sơ');
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Không thể cập nhật hồ sơ');
    } finally {
      setSaving(false);
    }
  };

  if (!mounted || !profile) {
    return (
      <RouteShell title="Hồ sơ" subtitle="Cập nhật thông tin tài khoản và theo dõi hoạt động mua sách.">
        <CommerceSection className="pb-16 pt-10">
          <div className="h-[300px] animate-pulse rounded-cards-lg bg-stone-surface" />
        </CommerceSection>
      </RouteShell>
    );
  }

  const initials = profile.full_name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  return (
    <RouteShell title="Hồ sơ" subtitle="Cập nhật thông tin tài khoản và theo dõi hoạt động mua sách.">
      <CommerceSection className="pb-16 pt-0">
        <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <aside className="rounded-cards-lg border border-stone-surface bg-white p-6" style={{ boxShadow: 'var(--shadow-sm)' }}>
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-ember/10 to-stone-surface font-display text-2xl tracking-[-0.02em] text-charcoal">
                {initials}
              </div>
              <div>
                <h2 className="font-display text-[1.4rem] leading-tight tracking-[-0.02em] text-charcoal">{profile.full_name}</h2>
                <p className="text-sm text-graphite">{profile.email}</p>
              </div>
            </div>
            <div className="mt-6 space-y-3 text-sm text-graphite">
              <div className="flex justify-between"><span>Vai trò</span><span className="capitalize">{profile.role}</span></div>
              {profile.role === 'user' ? (
                <>
                  <div className="flex justify-between"><span>Đơn hàng</span><span>{orderCount ?? 'Đang tải'}</span></div>
                  <div className="flex justify-between"><span>Địa chỉ</span><span>{addressCount ?? 'Đang tải'}</span></div>
                </>
              ) : null}
            </div>
          </aside>

          <form className="space-y-4 rounded-cards-lg border border-stone-surface bg-parchment p-6" style={{ boxShadow: 'var(--shadow-sm)' }}>
            <div className="h-1.5 w-14 rounded-full bg-ember/20" aria-hidden="true" />
            <h2 className="font-display text-[clamp(1.75rem,3vw,2.1rem)] leading-tight text-charcoal">Thông tin tài khoản</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <input className="rounded-full border border-stone-surface bg-white px-4 py-3 text-sm outline-none text-charcoal" placeholder="Họ tên" value={fullName} onChange={(event) => setFullName(event.target.value)} disabled={profile.role !== 'user'} />
              <input className="rounded-full border border-stone-surface bg-white px-4 py-3 text-sm outline-none text-charcoal" placeholder="Điện thoại" value={phone} onChange={(event) => setPhone(event.target.value)} disabled={profile.role !== 'user'} />
              <input className="rounded-full border border-stone-surface bg-stone-surface px-4 py-3 text-sm outline-none text-ash md:col-span-2" placeholder="Email" value={profile.email} disabled />
            </div>
            {profile.role === 'user' ? (
              <Button className="w-fit" type="button" onClick={handleSave} disabled={saving}>
                {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
              </Button>
            ) : null}
          </form>
        </div>
      </CommerceSection>
    </RouteShell>
  );
}
