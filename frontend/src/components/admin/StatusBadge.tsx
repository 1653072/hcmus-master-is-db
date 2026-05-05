'use client';

interface StatusBadgeProps {
  status: string;
  variant?: 'order' | 'user' | 'book';
}

const orderColors: Record<string, string> = {
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  confirmed: 'bg-blue-50 text-blue-700 border-blue-200',
  packing: 'bg-violet-50 text-violet-700 border-violet-200',
  shipping: 'bg-cyan-50 text-cyan-700 border-cyan-200',
  completed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  cancelled: 'bg-red-50 text-red-600 border-red-200',
};

const userColors: Record<string, string> = {
  admin: 'bg-orange-50 text-orange-700 border-orange-200',
  user: 'bg-stone-50 text-zinc-600 border-stone-200',
};

const activeColors: Record<string, string> = {
  true: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  false: 'bg-red-50 text-red-600 border-red-200',
};

export function StatusBadge({ status, variant = 'order' }: StatusBadgeProps) {
  const colorMap = variant === 'user' ? userColors : variant === 'book' ? activeColors : orderColors;
  const colors = colorMap[status.toLowerCase()] || 'bg-stone-50 text-zinc-500 border-stone-200';

  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.06em] ${colors}`}>
      {status}
    </span>
  );
}
