import Link from 'next/link';

import { RouteShell } from '@/components/layout/RouteShell';

const users = [
  { name: 'Lan Anh', email: 'lan@example.com', role: 'user' },
  { name: 'Hoang Nam', email: 'nam@example.com', role: 'admin' },
  { name: 'Minh Chau', email: 'chau@example.com', role: 'user' },
];

export default function Page() {
  return (
    <RouteShell title="Admin users" subtitle="Manage users and roles with a clean editorial admin layout.">
      <section className="mx-auto max-w-[1280px] px-6 pb-16 pt-0 lg:px-10 xl:px-14">
        <div className="space-y-4">
          {users.map((user) => (
            <div key={user.email} className="grid gap-4 rounded-[28px] border border-stone-200 bg-white/85 p-5 shadow-[0_10px_28px_rgba(68,53,33,0.06)] md:grid-cols-[1fr_auto_auto] md:items-center">
              <div>
                <p className="text-sm font-semibold text-zinc-900">{user.name}</p>
                <p className="text-sm text-zinc-600">{user.email}</p>
              </div>
              <p className="text-sm uppercase tracking-[0.22em] text-zinc-500">{user.role}</p>
              <Link href="/admin/users" className="inline-flex min-h-11 items-center rounded-full border border-stone-200 bg-white px-4 text-sm font-medium text-zinc-800 transition hover:border-stone-300 hover:text-zinc-900">Open</Link>
            </div>
          ))}
        </div>
      </section>
    </RouteShell>
  );
}
