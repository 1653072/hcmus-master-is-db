interface AuthorStripProps {
  authors: string[];
}

export function AuthorStrip({ authors }: AuthorStripProps) {
  return (
    <section className="border-y border-stone-200 bg-stone-50/70 px-6 py-6 lg:px-10 xl:px-24">
      <div className="mx-auto grid max-w-[1280px] gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {authors.map((name) => (
          <div key={name} className="flex items-center gap-3 rounded-full border border-stone-200 bg-white/80 px-4 py-3 shadow-[0_8px_24px_rgba(68,53,33,0.05)]">
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-amber-100 to-stone-200" />
            <div className="min-w-0">
              <span className="block truncate text-sm font-semibold text-zinc-800">{name}</span>
              <span className="text-xs text-zinc-500">Featured author</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
