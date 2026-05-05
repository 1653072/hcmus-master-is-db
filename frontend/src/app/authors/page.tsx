import Link from 'next/link';

const authors = ['James Clear', 'Morgan Housel', 'Leil Lowndes', 'Susan Cain', 'Rick Rubin', 'Cal Newport'];

export default function Page() {
  return (
    <main className="min-h-screen bg-[#faf6ef] text-[#201913]">
      <section className="mx-auto max-w-[1280px] px-6 pb-16 pt-10 lg:px-10 xl:px-14">
        <p className="text-sm text-[#7a6f63]"><Link href="/" className="transition hover:text-[#201913]">Home</Link> / Authors</p>
        <div className="mt-6 rounded-[28px] border border-[#e7ddcf] bg-white p-6 shadow-[0_10px_24px_rgba(67,50,30,0.04)]">
          <h1 className="font-display text-[3rem] leading-none text-[#2a241f]">Authors</h1>
        </div>
        <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {authors.map((name) => (
            <article key={name} className="rounded-[22px] border border-[#e7ddcf] bg-white p-5 shadow-[0_10px_24px_rgba(67,50,30,0.04)]">
              <div className="h-20 w-20 rounded-full bg-[#201913]" />
              <h2 className="mt-4 font-display text-[1.35rem] text-[#201913]">{name}</h2>
              <p className="mt-2 text-sm text-[#7a6f63]">Curated author page and featured books.</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
