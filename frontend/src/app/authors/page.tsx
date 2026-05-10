import { RouteShell } from '@/components/layout/RouteShell';

const authors = ['James Clear', 'Morgan Housel', 'Leil Lowndes', 'Susan Cain', 'Rick Rubin', 'Cal Newport'];

export default function Page() {
  return (
    <RouteShell title="Authors" subtitle="Curated author pages and featured books.">
      <section className="mx-auto max-w-page px-6 pb-16 pt-10 lg:px-10 xl:px-24">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {authors.map((name) => (
            <article key={name} className="rounded-cards-lg bg-white p-5 transition duration-200 hover:shadow-card-hover" style={{ boxShadow: 'var(--shadow-subtle)' }}>
              <div className="h-20 w-20 rounded-full bg-parchment" />
              <h2 className="mt-4 text-[19px] font-semibold tracking-[-0.25px] text-charcoal">{name}</h2>
              <p className="mt-2 text-[13px] tracking-[-0.17px] text-graphite">Curated author page and featured books.</p>
            </article>
          ))}
        </div>
      </section>
    </RouteShell>
  );
}
