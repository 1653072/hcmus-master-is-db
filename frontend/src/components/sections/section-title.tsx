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
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.28em] text-[#8b8176]">{eyebrow}</p>
        <h2 className="font-serif text-3xl leading-tight text-[#1e1a16] md:text-[2.15rem]">{title}</h2>
        {subtitle ? <p className="mt-3 max-w-2xl text-sm leading-7 text-[#5f564d]">{subtitle}</p> : null}
      </div>
      {action ? (
        <a className="hidden items-center gap-2 text-sm font-medium text-[#8e6224] transition hover:text-[#a87433] md:inline-flex" href={action.href}>
          {action.label}
        </a>
      ) : null}
    </div>
  );
}
