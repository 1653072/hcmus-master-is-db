'use client';

import { useCallback, useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'default';
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'default',
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    },
    [onCancel],
  );

  useEffect(() => {
    if (open) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [open, handleKeyDown]);

  if (!open) return null;

  return (
    <>
      {/* Overlay */}
      <div
        ref={overlayRef}
        className="fixed inset-0 z-[60] bg-midnight/40 backdrop-blur-sm"
        onClick={onCancel}
      />

      {/* Dialog */}
      <div className="fixed inset-0 z-[61] flex items-center justify-center p-4">
        <div
          className="w-full max-w-md rounded-cards-lg border border-stone-surface bg-white p-6"
          style={{ boxShadow: 'var(--shadow-md)' }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-display text-lg font-bold tracking-[-0.02em] text-charcoal">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-graphite">{description}</p>
            </div>
            <button
              type="button"
              onClick={onCancel}
              className="ml-4 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-ash transition-colors hover:bg-parchment hover:text-graphite"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              className="rounded-full border border-stone-surface bg-white px-4 py-2 text-sm font-medium text-charcoal transition-colors hover:bg-parchment disabled:opacity-50"
            >
              {cancelLabel}
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={loading}
              className={`rounded-full px-4 py-2 text-sm font-semibold text-white transition-colors disabled:opacity-50 ${
                variant === 'danger'
                  ? 'bg-coral-red hover:bg-coral-red/90 shadow-[0_4px_12px_rgba(230,84,60,0.25)]'
                  : 'bg-ember hover:bg-ember/90 shadow-[0_4px_12px_rgba(234,88,12,0.25)]'
              }`}
            >
              {loading ? 'Processing...' : confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
