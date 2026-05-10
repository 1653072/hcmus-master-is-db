import type { ReactNode } from 'react';

interface SectionHeaderProps {
  title: string;
  action?: ReactNode;
  subtitle?: string;
}

export function SectionHeader({ title, subtitle, action }: SectionHeaderProps) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="space-y-2">
        <h2 className="font-inter text-[44px] font-semibold leading-[1.09] tracking-[-1.14px] text-charcoal">{title}</h2>
        {subtitle ? <p className="max-w-[560px] text-[17px] leading-[1.47] tracking-[-0.22px] text-graphite">{subtitle}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
