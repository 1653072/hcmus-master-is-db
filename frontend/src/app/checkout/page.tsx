import Link from 'next/link';

import { RouteShell } from '@/components/layout/RouteShell';
import { Button } from '@/components/ui/button';

export default function Page() {
  return (
    <RouteShell title="Checkout" subtitle="Confirm your details and place your order in one calm step.">
      <section className="mx-auto max-w-[1280px] px-6 pb-16 pt-0 lg:px-10 xl:px-14">
        <div className="grid gap-6 lg:grid-cols-[1fr_0.42fr]">
          <form className="space-y-4 rounded-[28px] border border-stone-200 bg-white/85 p-5 shadow-[0_10px_28px_rgba(68,53,33,0.06)]">
            <div className="h-1.5 w-14 rounded-full bg-orange-200" aria-hidden="true" />
            <div className="grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.28em] text-zinc-500">Full name</span>
                <input className="w-full rounded-full border border-stone-200 bg-stone-50 px-4 py-3 text-sm outline-none transition placeholder:text-zinc-400 focus:border-orange-300 focus:bg-white focus:ring-2 focus:ring-orange-500/20" placeholder="Full name" />
              </label>
              <label className="block">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.28em] text-zinc-500">Phone</span>
                <input className="w-full rounded-full border border-stone-200 bg-stone-50 px-4 py-3 text-sm outline-none transition placeholder:text-zinc-400 focus:border-orange-300 focus:bg-white focus:ring-2 focus:ring-orange-500/20" placeholder="Phone" />
              </label>
            </div>
            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.28em] text-zinc-500">Address</span>
              <input className="w-full rounded-full border border-stone-200 bg-stone-50 px-4 py-3 text-sm outline-none transition placeholder:text-zinc-400 focus:border-orange-300 focus:bg-white focus:ring-2 focus:ring-orange-500/20" placeholder="Address" />
            </label>
            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.28em] text-zinc-500">Note</span>
              <textarea className="min-h-32 w-full rounded-[22px] border border-stone-200 bg-stone-50 px-4 py-3 text-sm outline-none transition placeholder:text-zinc-400 focus:border-orange-300 focus:bg-white focus:ring-2 focus:ring-orange-500/20" placeholder="Note" />
            </label>
          </form>

          <aside className="rounded-[28px] border border-stone-200 bg-stone-50/80 p-5 shadow-[0_10px_28px_rgba(68,53,33,0.05)]">
            <div className="h-1.5 w-14 rounded-full bg-orange-200" aria-hidden="true" />
            <h2 className="mt-3 font-display text-[clamp(1.75rem,3vw,2.1rem)] leading-[1.05] tracking-[-0.02em] text-zinc-900">Payment summary</h2>
            <div className="mt-4 space-y-3 text-sm text-zinc-600">
              <div className="flex justify-between"><span>Subtotal</span><span>$72</span></div>
              <div className="flex justify-between"><span>Shipping</span><span>$4</span></div>
              <div className="flex justify-between border-t border-stone-200 pt-3 font-semibold text-zinc-900"><span>Total</span><span>$76</span></div>
            </div>
            <Button className="mt-6 w-full">
              Place order
            </Button>
          </aside>
        </div>
      </section>
    </RouteShell>
  );
}
