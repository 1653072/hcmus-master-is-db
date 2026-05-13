import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function normalizeCurrencyAmount(value?: number | string | null) {
  const amount = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN;
  if (!Number.isFinite(amount) || amount <= 0) return undefined;
  return amount < 1000 ? amount * 1000 : amount;
}

export function formatCurrency(value?: number | string | null, fallback = 'Liên hệ') {
  const amount = normalizeCurrencyAmount(value);
  if (typeof amount !== 'number') return fallback;
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(amount);
}
