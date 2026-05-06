'use client';

import { useCallback, useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, PackagePlus } from 'lucide-react';
import { toast } from 'sonner';

import { booksApi } from '@/lib/api/books';
import { StatusBadge } from '@/components/admin/StatusBadge';
import { Pagination } from '@/components/admin/Pagination';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import { BookFormDrawer } from '@/components/admin/BookFormDrawer';

const PAGE_SIZE = 10;

export default function Page() {
  const [books, setBooks] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  /* Form drawer */
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingBook, setEditingBook] = useState<any | null>(null);

  /* Delete */
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const [deleting, setDeleting] = useState(false);

  /* Stock update */
  const [stockTarget, setStockTarget] = useState<any | null>(null);
  const [stockValue, setStockValue] = useState('');
  const [updatingStock, setUpdatingStock] = useState(false);

  const fetchBooks = useCallback(async () => {
    try {
      setLoading(true);
      const res = await booksApi.adminList({ page, page_size: PAGE_SIZE });
      setBooks(res?.data ?? []);
      setTotal(res?.total ?? 0);
    } catch {
      toast.error('Failed to load books');
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchBooks();
  }, [fetchBooks]);

  /* Handlers */
  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await booksApi.adminDelete(deleteTarget.id);
      toast.success('Book deleted');
      setDeleteTarget(null);
      fetchBooks();
    } catch {
      toast.error('Failed to delete book');
    } finally {
      setDeleting(false);
    }
  };

  const handleStockUpdate = async () => {
    if (!stockTarget) return;
    const qty = parseInt(stockValue, 10);
    if (isNaN(qty) || qty < 0) {
      toast.error('Invalid stock quantity');
      return;
    }
    setUpdatingStock(true);
    try {
      await booksApi.adminUpdateStock(stockTarget.id, { stock_quantity: qty });
      toast.success('Stock updated');
      setStockTarget(null);
      setStockValue('');
      fetchBooks();
    } catch {
      toast.error('Failed to update stock');
    } finally {
      setUpdatingStock(false);
    }
  };

  const openCreate = () => {
    setEditingBook(null);
    setDrawerOpen(true);
  };

  const openEdit = (book: any) => {
    setEditingBook(book);
    setDrawerOpen(true);
  };

  const openStock = (book: any) => {
    setStockTarget(book);
    setStockValue(String(book.stock_quantity ?? 0));
  };

  return (
    <div className="px-6 py-8 lg:px-10">
      {/* Header */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="h-1.5 w-14 rounded-full bg-orange-200" aria-hidden="true" />
          <h1 className="mt-4 font-display text-[clamp(2rem,4vw,2.8rem)] leading-[0.98] tracking-[-0.03em] text-zinc-900">
            Manage Books
          </h1>
          <p className="mt-3 text-sm text-zinc-500">
            {total} book{total !== 1 ? 's' : ''} in catalog
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-2 rounded-full bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white shadow-[0_6px_16px_rgba(234,88,12,0.25)] transition-all hover:bg-orange-600 hover:-translate-y-0.5"
        >
          <Plus className="h-4 w-4" />
          Add Book
        </button>
      </div>

      {/* Table */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-2xl bg-stone-200/60" />
          ))}
        </div>
      ) : books.length === 0 ? (
        <div className="rounded-2xl border border-stone-200 bg-white/80 p-12 text-center">
          <p className="text-sm text-zinc-500">No books found. Start by adding your first book.</p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-2xl border border-stone-200 bg-white/85 shadow-[0_6px_20px_rgba(68,53,33,0.05)]">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-stone-100">
                  <th className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-[0.14em] text-zinc-400">Book</th>
                  <th className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-[0.14em] text-zinc-400">Price</th>
                  <th className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-[0.14em] text-zinc-400">Stock</th>
                  <th className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-[0.14em] text-zinc-400">Status</th>
                  <th className="px-5 py-3.5 text-right text-[11px] font-bold uppercase tracking-[0.14em] text-zinc-400">Actions</th>
                </tr>
              </thead>
              <tbody>
                {books.map((book: any) => (
                  <tr key={book.id} className="border-b border-stone-50 transition-colors hover:bg-stone-50/60">
                    <td className="px-5 py-3.5">
                      <p className="font-semibold text-zinc-900 line-clamp-1">{book.name}</p>
                      <p className="mt-0.5 text-xs text-zinc-400 line-clamp-1">
                        {book.authors?.map((a: any) => a.author_name).join(', ') || '—'}
                      </p>
                    </td>
                    <td className="px-5 py-3.5 font-medium text-zinc-700">
                      {book.pricing?.price != null ? `$${book.pricing.price.toFixed(2)}` : '—'}
                    </td>
                    <td className="px-5 py-3.5">
                      <button
                        type="button"
                        onClick={() => openStock(book)}
                        className="inline-flex items-center gap-1 text-zinc-700 transition-colors hover:text-orange-600"
                        title="Update stock"
                      >
                        <span className="font-medium">{book.stock_quantity ?? '—'}</span>
                        <PackagePlus className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100" />
                      </button>
                    </td>
                    <td className="px-5 py-3.5">
                      <StatusBadge status={book.product_status || 'active'} variant="book" />
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => openEdit(book)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-stone-100 hover:text-zinc-700"
                          title="Edit"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(book)}
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

      {/* Book Form Drawer */}
      <BookFormDrawer
        open={drawerOpen}
        book={editingBook}
        onClose={() => setDrawerOpen(false)}
        onSaved={() => {
          setDrawerOpen(false);
          fetchBooks();
        }}
      />

      {/* Delete Dialog */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete book"
        description={`Are you sure you want to delete "${deleteTarget?.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      {/* Stock Update Dialog */}
      {stockTarget && (
        <>
          <div className="fixed inset-0 z-[60] bg-zinc-950/40 backdrop-blur-sm" onClick={() => setStockTarget(null)} />
          <div className="fixed inset-0 z-[61] flex items-center justify-center p-4">
            <div className="w-full max-w-sm rounded-2xl border border-stone-200 bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
              <h3 className="font-display text-lg font-bold text-zinc-900">Update Stock</h3>
              <p className="mt-1 text-sm text-zinc-500 line-clamp-1">{stockTarget.name}</p>
              <input
                type="number"
                min="0"
                value={stockValue}
                onChange={(e) => setStockValue(e.target.value)}
                className="mt-4 w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm outline-none focus:border-orange-300 focus:ring-2 focus:ring-orange-500/15"
                placeholder="Stock quantity"
              />
              <div className="mt-5 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setStockTarget(null)}
                  className="rounded-full border border-stone-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-stone-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleStockUpdate}
                  disabled={updatingStock}
                  className="rounded-full bg-orange-500 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-orange-600 disabled:opacity-50"
                >
                  {updatingStock ? 'Saving...' : 'Update'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
