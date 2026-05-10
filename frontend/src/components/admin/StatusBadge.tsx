'use client';

interface StatusBadgeProps {
  status: string;
  variant?: 'order' | 'user' | 'book';
}

const orderColors: Record<string, string> = {
  pending: 'bg-sunburst/10 text-deep-amber border-sunburst/20',
  confirmed: 'bg-sky-accent/10 text-sky-accent border-sky-accent/20',
  packing: 'bg-violet-pop/10 text-violet-pop border-violet-pop/20',
  shipping: 'bg-sky-accent/10 text-sky-accent border-sky-accent/20',
  completed: 'bg-meadow/10 text-meadow border-meadow/20',
  cancelled: 'bg-coral-red/5 text-coral-red border-coral-red/20',
};

const userColors: Record<string, string> = {
  admin: 'bg-ember/10 text-ember border-ember/20',
  user: 'bg-parchment text-graphite border-stone-surface',
};

const activeColors: Record<string, string> = {
  true: 'bg-meadow/10 text-meadow border-meadow/20',
  false: 'bg-coral-red/5 text-coral-red border-coral-red/20',
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
