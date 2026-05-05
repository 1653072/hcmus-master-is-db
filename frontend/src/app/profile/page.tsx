import Link from 'next/link';

import { RouteShell } from '@/components/layout/RouteShell';
import { Button } from '@/components/ui/button';

export default function Page() {
  return (
    <RouteShell title="Profile" subtitle="Update your account details and manage your reading preferences.">
      <section className="mx-auto max-w-[1280px] px-6 pb-16 pt-0 lg:px-10 xl:px-14">
        <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <aside className="rounded-[28px] border border-stone-200 bg-white/85 p-6 shadow-[0_10px_28px_rgba(68,53,33,0.06)]">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-orange-100 to-stone-200 font-display text-2xl tracking-[-0.02em] text-zinc-700">PH</div>
              <div>
                <h2 className="font-display text-[1.4rem] leading-tight tracking-[-0.02em] text-zinc-900">Paper Reader</h2>
                <p className="text-sm text-zinc-600">reader@paperhaven.vn</p>
              </div>
            </div>
            <div className="mt-6 space-y-3 text-sm text-zinc-600">
              <div className="flex justify-between"><span>Member since</span><span>2026</span></div>
              <div className="flex justify-between"><span>Orders</span><span>12</span></div>
              <div className="flex justify-between"><span>Wishlist</span><span>8</span></div>
            </div>
          </aside>

          <form className="space-y-4 rounded-[28px] border border-stone-200 bg-stone-50/80 p-6 shadow-[0_10px_28px_rgba(68,53,33,0.05)]">
            <div className="h-1.5 w-14 rounded-full bg-orange-200" aria-hidden="true" />
            <h2 className="font-display text-[clamp(1.75rem,3vw,2.1rem)] leading-[1.05] tracking-[-0.02em] text-zinc-900">Account details</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <input className="rounded-full border border-stone-200 bg-white px-4 py-3 text-sm outline-none" placeholder="Full name" />
              <input className="rounded-full border border-stone-200 bg-white px-4 py-3 text-sm outline-none" placeholder="Phone" />
              <input className="rounded-full border border-stone-200 bg-white px-4 py-3 text-sm outline-none md:col-span-2" placeholder="Email" />
            </div>
            <Button className="w-fit">Save changes</Button>
          </form>
        </div>
      </section>
    </RouteShell>
  );
}
