'use client';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';

import { booksApi } from '@/lib/api/books';

const bookSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  short_description: z.string().optional(),
  detail_description: z.string().optional(),
  product_status: z.string().optional(),
  price: z.coerce.number().min(0, 'Price must be >= 0'),
  category_id: z.string().optional(),
  author_name: z.string().min(1, 'At least one author is required'),
  stock_quantity: z.coerce.number().int().min(0, 'Stock must be >= 0'),
});

type BookFormData = z.infer<typeof bookSchema>;

interface BookFormDrawerProps {
  open: boolean;
  book?: any | null;
  onClose: () => void;
  onSaved: () => void;
}

export function BookFormDrawer({ open, book, onClose, onSaved }: BookFormDrawerProps) {
  const isEditing = !!book;
  const [saving, setSaving] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<BookFormData>({
    resolver: zodResolver(bookSchema) as any,
  });

  useEffect(() => {
    if (open) {
      if (book) {
        reset({
          name: book.name || '',
          short_description: book.short_description || '',
          detail_description: book.detail_description || '',
          product_status: book.product_status || '',
          price: book.pricing?.price ?? 0,
          category_id: book.category?.category_id || '',
          author_name: book.authors?.map((a: any) => a.author_name).join(', ') || '',
          stock_quantity: book.stock_quantity ?? 0,
        });
      } else {
        reset({
          name: '',
          short_description: '',
          detail_description: '',
          product_status: '',
          price: 0,
          category_id: '',
          author_name: '',
          stock_quantity: 0,
        });
      }
    }
  }, [open, book, reset]);

  const onSubmit = async (data: BookFormData) => {
    setSaving(true);
    try {
      const payload: any = {
        name: data.name,
        short_description: data.short_description || '',
        detail_description: data.detail_description || '',
        product_status: data.product_status || 'active',
        pricing: { price: data.price },
        category: data.category_id ? { category_id: data.category_id } : undefined,
        authors: data.author_name.split(',').map((name) => ({
          author_name: name.trim(),
          author_id: '',
          slug: name.trim().toLowerCase().replace(/\s+/g, '-'),
        })),
        stock_quantity: data.stock_quantity,
        tags: [],
        images: [],
      };

      if (isEditing) {
        await booksApi.adminUpdate(book.id, payload);
        toast.success('Book updated');
      } else {
        await booksApi.adminCreate(payload);
        toast.success('Book created');
      }
      onSaved();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to save book');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      {/* Overlay */}
      <div
        className={`fixed inset-0 z-[60] bg-zinc-950/40 backdrop-blur-sm transition-opacity duration-200 ${
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className={`fixed inset-y-0 right-0 z-[61] w-full max-w-lg bg-white shadow-[-8px_0_32px_rgba(0,0,0,0.1)] transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Drawer header */}
        <div className="flex items-center justify-between border-b border-stone-100 px-6 py-4">
          <h2 className="font-display text-lg font-bold text-zinc-900">
            {isEditing ? 'Edit Book' : 'Add Book'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 hover:bg-stone-100 hover:text-zinc-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-1 flex-col overflow-y-auto px-6 py-5">
          <div className="space-y-4">
            {/* Name */}
            <div>
              <label className="mb-1.5 block text-[13px] font-semibold text-zinc-700">Title *</label>
              <input
                {...register('name')}
                className="w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm outline-none transition-colors focus:border-orange-300 focus:ring-2 focus:ring-orange-500/15"
                placeholder="Book title"
              />
              {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>}
            </div>

            {/* Short Description */}
            <div>
              <label className="mb-1.5 block text-[13px] font-semibold text-zinc-700">Short Description</label>
              <textarea
                {...register('short_description')}
                rows={2}
                className="w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm outline-none transition-colors focus:border-orange-300 focus:ring-2 focus:ring-orange-500/15 resize-none"
                placeholder="Brief summary"
              />
            </div>

            {/* Detail Description */}
            <div>
              <label className="mb-1.5 block text-[13px] font-semibold text-zinc-700">Detail Description</label>
              <textarea
                {...register('detail_description')}
                rows={4}
                className="w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm outline-none transition-colors focus:border-orange-300 focus:ring-2 focus:ring-orange-500/15 resize-none"
                placeholder="Full description"
              />
            </div>

            {/* Price + Stock */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1.5 block text-[13px] font-semibold text-zinc-700">Price *</label>
                <input
                  type="number"
                  step="0.01"
                  {...register('price')}
                  className="w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm outline-none transition-colors focus:border-orange-300 focus:ring-2 focus:ring-orange-500/15"
                  placeholder="0.00"
                />
                {errors.price && <p className="mt-1 text-xs text-red-500">{errors.price.message}</p>}
              </div>
              <div>
                <label className="mb-1.5 block text-[13px] font-semibold text-zinc-700">Stock *</label>
                <input
                  type="number"
                  {...register('stock_quantity')}
                  className="w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm outline-none transition-colors focus:border-orange-300 focus:ring-2 focus:ring-orange-500/15"
                  placeholder="0"
                />
                {errors.stock_quantity && <p className="mt-1 text-xs text-red-500">{errors.stock_quantity.message}</p>}
              </div>
            </div>

            {/* Author */}
            <div>
              <label className="mb-1.5 block text-[13px] font-semibold text-zinc-700">Authors *</label>
              <input
                {...register('author_name')}
                className="w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm outline-none transition-colors focus:border-orange-300 focus:ring-2 focus:ring-orange-500/15"
                placeholder="Author 1, Author 2"
              />
              {errors.author_name && <p className="mt-1 text-xs text-red-500">{errors.author_name.message}</p>}
              <p className="mt-1 text-[11px] text-zinc-400">Separate multiple authors with commas</p>
            </div>

            {/* Category ID */}
            <div>
              <label className="mb-1.5 block text-[13px] font-semibold text-zinc-700">Category ID</label>
              <input
                {...register('category_id')}
                className="w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm outline-none transition-colors focus:border-orange-300 focus:ring-2 focus:ring-orange-500/15"
                placeholder="MongoDB category ID (optional)"
              />
            </div>

            {/* Status */}
            <div>
              <label className="mb-1.5 block text-[13px] font-semibold text-zinc-700">Status</label>
              <select
                {...register('product_status')}
                className="w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm outline-none transition-colors focus:border-orange-300 focus:ring-2 focus:ring-orange-500/15"
              >
                <option value="active">Active</option>
                <option value="draft">Draft</option>
                <option value="archived">Archived</option>
              </select>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-8 flex items-center gap-3 border-t border-stone-100 pt-5">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-stone-200 bg-white px-5 py-2.5 text-sm font-medium text-zinc-700 hover:bg-stone-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-full bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white shadow-[0_4px_12px_rgba(234,88,12,0.25)] hover:bg-orange-600 disabled:opacity-50"
            >
              {saving ? 'Saving...' : isEditing ? 'Update Book' : 'Create Book'}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
