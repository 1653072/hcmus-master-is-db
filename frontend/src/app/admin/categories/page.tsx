'use client';

import { useCallback, useEffect, useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { categoriesApi } from '@/lib/api/categories';
import { Pagination } from '@/components/admin/Pagination';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import { CategoryFormDrawer } from '@/components/admin/CategoryFormDrawer';

const PAGE_SIZE = 10;

export default function Page() {
  const [categories, setCategories] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchCategories = useCallback(async () => {
    try {
      setLoading(true);
      const res = await categoriesApi.adminList({ page, page_size: PAGE_SIZE });
      setCategories(res?.data ?? []);
      setTotal(res?.total ?? 0);
    } catch {
      toast.error('Failed to load categories');
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await categoriesApi.adminDelete(deleteTarget.id);
      toast.success('Category deleted');
      setDeleteTarget(null);
      fetchCategories();
    } catch {
      toast.error('Failed to delete category');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="px-6 py-8 lg:px-10">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="h-1.5 w-14 rounded-full bg-orange-200" aria-hidden="true" />
          <h1 className="mt-4 font-display text-[clamp(2rem,4vw,2.8rem)] leading-[0.98] tracking-[-0.03em] text-zinc-900">
            Manage Categories
          </h1>
          <p className="mt-3 text-sm text-zinc-500">
            {total} categor{total !== 1 ? 'ies' : 'y'} in store
          </p>
        </div>
        <button
          type="button"
          onClick={() => { setEditingCategory(null); setDrawerOpen(true); }}
          className="inline-flex items-center gap-2 rounded-full bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white shadow-[0_6px_16px_rgba(234,88,12,0.25)] transition-all hover:bg-orange-600 hover:-translate-y-0.5"
        >
          <Plus className="h-4 w-4" />
          Add Category
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-14 animate-pulse rounded-2xl bg-stone-200/60" />
          ))}
        </div>
      ) : categories.length === 0 ? (
        <div className="rounded-2xl border border-stone-200 bg-white/80 p-12 text-center">
          <p className="text-sm text-zinc-500">No categories yet. Create one to organize your books.</p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-2xl border border-stone-200 bg-white/85 shadow-[0_6px_20px_rgba(68,53,33,0.05)]">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-stone-100">
                  <th className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-[0.14em] text-zinc-400">Name</th>
                  <th className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-[0.14em] text-zinc-400">Slug</th>
                  <th className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-[0.14em] text-zinc-400">Parent</th>
                  <th className="px-5 py-3.5 text-right text-[11px] font-bold uppercase tracking-[0.14em] text-zinc-400">Actions</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((cat: any) => (
                  <tr key={cat.id} className="border-b border-stone-50 transition-colors hover:bg-stone-50/60">
                    <td className="px-5 py-3.5 font-semibold text-zinc-900">{cat.category_name}</td>
                    <td className="px-5 py-3.5 font-mono text-xs text-zinc-500">{cat.slug}</td>
                    <td className="px-5 py-3.5 text-zinc-500">{cat.parent_category || '—'}</td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => { setEditingCategory(cat); setDrawerOpen(true); }}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-stone-100 hover:text-zinc-700"
                          title="Edit"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(cat)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-red-50 hover:text-red-500"
                          title="Delete"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} />
        </>
      )}

      <CategoryFormDrawer
        open={drawerOpen}
        category={editingCategory}
        onClose={() => setDrawerOpen(false)}
        onSaved={() => { setDrawerOpen(false); fetchCategories(); }}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete category"
        description={`Are you sure you want to delete "${deleteTarget?.category_name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
