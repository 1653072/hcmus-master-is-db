import type { ReactNode } from 'react';

interface SectionHeaderProps {
  title: string;
  action?: ReactNode;
  subtitle?: string;
}

export function SectionHeader({ title, subtitle, action }: SectionHeaderProps) {
  return (
    <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="space-y-2">
        <h2 className="text-[28px] font-semibold leading-tight text-charcoal md:text-[34px]">{title}</h2>
        {subtitle ? <p className="max-w-[560px] text-[15px] leading-7 text-graphite">{subtitle}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
