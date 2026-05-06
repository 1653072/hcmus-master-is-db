'use client';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';

import { categoriesApi } from '@/lib/api/categories';

const categorySchema = z.object({
  category_name: z.string().min(1, 'Name is required'),
  slug: z.string().min(1, 'Slug is required'),
  parent_category: z.string().optional(),
});

type CategoryFormData = z.infer<typeof categorySchema>;

interface CategoryFormDrawerProps {
  open: boolean;
  category?: any | null;
  onClose: () => void;
  onSaved: () => void;
}

export function CategoryFormDrawer({ open, category, onClose, onSaved }: CategoryFormDrawerProps) {
  const isEditing = !!category;
  const [saving, setSaving] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CategoryFormData>({
    resolver: zodResolver(categorySchema),
  });

  const nameValue = watch('category_name');

  useEffect(() => {
    if (open) {
      if (category) {
        reset({
          category_name: category.category_name || '',
          slug: category.slug || '',
          parent_category: category.parent_category || '',
        });
      } else {
        reset({ category_name: '', slug: '', parent_category: '' });
      }
    }
  }, [open, category, reset]);

  /* Auto-generate slug from name (only in create mode) */
  useEffect(() => {
    if (!isEditing && nameValue) {
      const slug = nameValue
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-');
      setValue('slug', slug);
    }
  }, [nameValue, isEditing, setValue]);

  const onSubmit = async (data: CategoryFormData) => {
    setSaving(true);
    try {
      if (isEditing) {
        await categoriesApi.adminUpdate(category.id, data);
        toast.success('Category updated');
      } else {
        await categoriesApi.adminCreate(data);
        toast.success('Category created');
      }
      onSaved();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to save category');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div
        className={`fixed inset-0 z-[60] bg-zinc-950/40 backdrop-blur-sm transition-opacity duration-200 ${
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={onClose}
      />

      <div
        className={`fixed inset-y-0 right-0 z-[61] w-full max-w-md bg-white shadow-[-8px_0_32px_rgba(0,0,0,0.1)] transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between border-b border-stone-100 px-6 py-4">
          <h2 className="font-display text-lg font-bold text-zinc-900">
            {isEditing ? 'Edit Category' : 'Add Category'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 hover:bg-stone-100 hover:text-zinc-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col overflow-y-auto px-6 py-5">
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-[13px] font-semibold text-zinc-700">Name *</label>
              <input
                {...register('category_name')}
                className="w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm outline-none focus:border-orange-300 focus:ring-2 focus:ring-orange-500/15"
                placeholder="Category name"
              />
              {errors.category_name && <p className="mt-1 text-xs text-red-500">{errors.category_name.message}</p>}
            </div>

            <div>
              <label className="mb-1.5 block text-[13px] font-semibold text-zinc-700">Slug *</label>
              <input
                {...register('slug')}
                className="w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm font-mono outline-none focus:border-orange-300 focus:ring-2 focus:ring-orange-500/15"
                placeholder="category-slug"
              />
              {errors.slug && <p className="mt-1 text-xs text-red-500">{errors.slug.message}</p>}
            </div>

            <div>
              <label className="mb-1.5 block text-[13px] font-semibold text-zinc-700">Parent Category</label>
              <input
                {...register('parent_category')}
                className="w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm outline-none focus:border-orange-300 focus:ring-2 focus:ring-orange-500/15"
                placeholder="Parent category ID (optional)"
              />
            </div>
          </div>

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
              {saving ? 'Saving...' : isEditing ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
