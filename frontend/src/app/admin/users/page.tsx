'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

import { adminApi } from '@/lib/api/admin';
import { StatusBadge } from '@/components/admin/StatusBadge';
import { Pagination } from '@/components/admin/Pagination';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';

const PAGE_SIZE = 10;

export default function Page() {
  const [users, setUsers] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const [toggleTarget, setToggleTarget] = useState<any | null>(null);
  const [toggling, setToggling] = useState(false);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const res = await adminApi.listUsers({ page, page_size: PAGE_SIZE });
      setUsers(res?.data ?? []);
      setTotal(res?.total ?? 0);
    } catch {
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleToggle = async () => {
    if (!toggleTarget) return;
    setToggling(true);
    try {
      const newActive = !toggleTarget.is_active;
      await adminApi.deactivateUser(toggleTarget.alias_id, { is_active: newActive });
      toast.success(newActive ? 'User activated' : 'User deactivated');
      setToggleTarget(null);
      fetchUsers();
    } catch {
      toast.error('Failed to update user');
    } finally {
      setToggling(false);
    }
  };

  return (
    <div className="px-6 py-8 lg:px-10">
      <div className="mb-8">
        <div className="h-1.5 w-14 rounded-full bg-orange-200" aria-hidden="true" />
        <h1 className="mt-4 font-display text-[clamp(2rem,4vw,2.8rem)] leading-[0.98] tracking-[-0.03em] text-zinc-900">
          Manage Users
        </h1>
        <p className="mt-3 text-sm text-zinc-500">{total} user{total !== 1 ? 's' : ''} registered</p>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-14 animate-pulse rounded-2xl bg-stone-200/60" />
          ))}
        </div>
      ) : users.length === 0 ? (
        <div className="rounded-2xl border border-stone-200 bg-white/80 p-12 text-center">
          <p className="text-sm text-zinc-500">No users found.</p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-2xl border border-stone-200 bg-white/85 shadow-[0_6px_20px_rgba(68,53,33,0.05)]">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-stone-100">
                  <th className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-[0.14em] text-zinc-400">User</th>
                  <th className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-[0.14em] text-zinc-400">Role</th>
                  <th className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-[0.14em] text-zinc-400">Status</th>
                  <th className="px-5 py-3.5 text-right text-[11px] font-bold uppercase tracking-[0.14em] text-zinc-400">Action</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user: any) => (
                  <tr key={user.alias_id} className="border-b border-stone-50 transition-colors hover:bg-stone-50/60">
                    <td className="px-5 py-3.5">
                      <p className="font-semibold text-zinc-900">{user.full_name}</p>
                      <p className="mt-0.5 text-xs text-zinc-400">{user.email}</p>
                    </td>
                    <td className="px-5 py-3.5">
                      <StatusBadge status={user.role} variant="user" />
                    </td>
                    <td className="px-5 py-3.5">
                      <StatusBadge status={user.is_active !== false ? 'Active' : 'Inactive'} variant="book" />
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <button
                        type="button"
                        onClick={() => setToggleTarget(user)}
                        className={`rounded-full px-3.5 py-1.5 text-[12px] font-semibold transition-colors ${
                          user.is_active !== false
                            ? 'border border-red-200 text-red-500 hover:bg-red-50'
                            : 'border border-emerald-200 text-emerald-600 hover:bg-emerald-50'
                        }`}
                      >
                        {user.is_active !== false ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} />
        </>
      )}

      <ConfirmDialog
        open={!!toggleTarget}
        title={toggleTarget?.is_active !== false ? 'Deactivate user' : 'Activate user'}
        description={`Are you sure you want to ${toggleTarget?.is_active !== false ? 'deactivate' : 'activate'} "${toggleTarget?.full_name}"?`}
        confirmLabel={toggleTarget?.is_active !== false ? 'Deactivate' : 'Activate'}
        variant={toggleTarget?.is_active !== false ? 'danger' : 'default'}
        loading={toggling}
        onConfirm={handleToggle}
        onCancel={() => setToggleTarget(null)}
      />
    </div>
  );
}
