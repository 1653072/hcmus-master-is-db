type SectionTitleProps = {
  title: string;
  subtitle?: string;
};

export function SectionTitle({ title, subtitle }: SectionTitleProps) {
  return (
    <div className="flex items-end justify-between gap-6">
      <div>
        <p className="mb-2 text-xs font-medium uppercase tracking-[0.2em] text-ash">Tuyển chọn</p>
        <h2 className="font-display text-3xl font-semibold leading-tight text-charcoal md:text-[2.15rem]">{title}</h2>
        {subtitle ? <p className="mt-3 max-w-2xl text-sm leading-7 text-graphite">{subtitle}</p> : null}
      </div>
    </div>
  );
}
