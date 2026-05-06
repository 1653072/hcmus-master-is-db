type SectionTitleProps = {
  title: string;
  subtitle?: string;
};

export function SectionTitle({ title, subtitle }: SectionTitleProps) {
  return (
    <div className="flex items-end justify-between gap-6">
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.28em] text-[#8b8176]">Curated selection</p>
        <h2 className="font-serif text-3xl leading-tight text-[#1e1a16] md:text-[2.15rem]">{title}</h2>
        {subtitle ? <p className="mt-3 max-w-2xl text-sm leading-7 text-[#5f564d]">{subtitle}</p> : null}
      </div>
    </div>
  );
}
