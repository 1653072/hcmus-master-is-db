import Link from 'next/link';

export default function Page() {
  return (
    <main className="min-h-screen bg-[#faf6ef] text-[#201913]">
      <section className="mx-auto max-w-[1280px] px-6 pb-16 pt-10 lg:px-10 xl:px-14">
        <p className="text-sm text-[#7a6f63]"><Link href="/" className="transition hover:text-[#201913]">Home</Link> / Blog</p>
        <div className="mt-6 rounded-[28px] border border-[#e7ddcf] bg-white p-6 shadow-[0_10px_24px_rgba(67,50,30,0.04)]">
          <h1 className="font-display text-[3rem] leading-none text-[#2a241f]">Blog</h1>
        </div>
      </section>
    </main>
  );
}
