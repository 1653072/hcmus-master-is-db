import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

interface RankingSectionProps {
  titles: string[];
}

const sectionRoutes = ['/best-sellers', '/most-viewed/30days', '/most-viewed/daily'];

export function RankingSection({ titles }: RankingSectionProps) {
  const sections = [
    {
      header: titles[0] ?? 'Best sellers',
      accent: 'amber',
      type: 'Last 30 days • Top 5',
      rows: ['Atomic Habits', 'Ikigai', 'The Almanack', 'Emotional Intelligence', 'How to Talk to Anyone', 'Who Moved My Cheese', 'The Psychology of Money', 'House of Stars', 'Charles Dickens', 'Curveball'],
    },
    {
      header: titles[1] ?? 'Most viewed this month',
      accent: 'blue',
      type: 'Last 30 days • Top 5',
      rows: ['10X Rules', 'Rich Dad Poor Dad', 'Still Like an Artist', 'The Subtle Art', 'Aurelius Clements', 'How to Keep Your Cool', 'Atomic Habits', 'Ikigai', 'The Almanack', 'Emotional Intelligence'],
    },
    {
      header: titles[2] ?? 'Trending today',
      accent: 'teal',
      type: 'Today • Top 5',
      rows: ['Aurelius Clements', 'House of Stars', 'Curveball', 'Dám Nghĩ Lớn', 'Đắc Nhân Tâm'],
    },
  ];

  return (
    <section className="mx-auto max-w-[1280px] px-6 py-16 lg:px-10 xl:px-24">
      <div className="mb-8 flex items-end justify-between gap-4">
        <div className="space-y-2">
          <div className="h-1.5 w-14 rounded-full bg-orange-200" aria-hidden="true" />
          <h2 className="font-display text-[clamp(1.75rem,3vw,2.35rem)] leading-[1.05] tracking-[-0.02em] text-zinc-900">Ranking board</h2>
        </div>
        <Link className="inline-flex items-center gap-2 text-sm font-semibold text-zinc-800 transition hover:text-orange-600" href="/best-sellers">
          See all
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="rounded-[24px] border border-stone-200 bg-white p-6 shadow-sm md:p-8">
        <div className="grid gap-10 lg:grid-cols-3 lg:gap-12">
          {sections.map((section, sectionIndex) => (
            <div key={section.header} className="flex flex-col">
              <div className="mb-6">
                <Link href={sectionRoutes[sectionIndex]} className="group flex flex-col gap-1.5">
                  <h3 className="text-[1.35rem] font-semibold text-zinc-900 transition group-hover:text-orange-600">{section.header}</h3>
                  <p className="text-sm text-zinc-500">{section.type}</p>
                </Link>
              </div>
              <div className="flex flex-col">
                {section.rows.slice(0, 5).map((row, index) => (
                  <Link key={row} href={`/books/${row.toLowerCase().replace(/ /g, '-')}`} className={`group flex items-center gap-4 py-4 ${index !== 4 ? 'border-b border-stone-100' : ''}`}>
                    <div className="flex w-6 shrink-0 justify-center">
                      {index === 0 ? (
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#fcd34d] text-sm font-bold text-[#92400e]">{index + 1}</div>
                      ) : index === 1 ? (
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#e5e7eb] text-sm font-bold text-[#374151]">{index + 1}</div>
                      ) : index === 2 ? (
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#fca5a5] text-sm font-bold text-[#991b1b]">{index + 1}</div>
                      ) : (
                        <span className="text-base font-semibold text-zinc-500">{index + 1}</span>
                      )}
                    </div>
                    
                    <div className={`h-14 w-10 shrink-0 rounded-sm shadow-sm ${
                      index % 5 === 0 ? 'bg-[#dcb581]' : 
                      index % 5 === 1 ? 'bg-[#a3c3d5]' : 
                      index % 5 === 2 ? 'bg-[#cba8e0]' : 
                      index % 5 === 3 ? 'bg-[#e0cba8]' : 'bg-[#a8e0cb]'
                    }`} />
                    
                    <div className="flex flex-1 flex-col justify-center gap-2">
                      <p className="line-clamp-1 text-[15px] font-semibold text-zinc-900 group-hover:text-orange-600 transition">{row}</p>
                      <div className="flex h-1.5 w-full items-center rounded-full bg-stone-100">
                        <div className={`h-1.5 rounded-full ${
                          index % 5 === 0 ? 'bg-[#fbbf24]' : 
                          index % 5 === 1 ? 'bg-[#93c5fd]' : 
                          index % 5 === 2 ? 'bg-[#fca5a5]' : 
                          index % 5 === 3 ? 'bg-[#d6d3d1]' : 'bg-[#bbf7d0]'
                        }`} style={{ width: `${Math.max(20, 95 - index * 15)}%` }} />
                      </div>
                    </div>
                    <div className="shrink-0 pt-6 text-sm text-zinc-600">
                      {(1240 - index * 130).toLocaleString()}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
