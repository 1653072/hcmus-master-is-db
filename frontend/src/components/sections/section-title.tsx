interface SectionTitleProps {
  eyebrow: string;
  title: string;
  subtitle?: string;
  action?: {
    label: string;
    href: string;
  };
}

export function SectionTitle({ eyebrow, title, subtitle, action }: SectionTitleProps) {
  return (
    <div className="flex items-end justify-between gap-6">
      <div>
        <p className="mb-2 text-xs font-medium uppercase tracking-[0.2em] text-ash">{eyebrow}</p>
        <h2 className="font-display text-3xl font-semibold leading-tight text-charcoal md:text-[2.15rem]">{title}</h2>
        {subtitle ? <p className="mt-3 max-w-2xl text-sm leading-7 text-graphite">{subtitle}</p> : null}
      </div>
      {action ? (
        <a className="hidden items-center gap-2 text-sm font-medium text-ember transition hover:text-coral-red md:inline-flex" href={action.href}>
          {action.label}
        </a>
      ) : null}
    </div>
  );
}
