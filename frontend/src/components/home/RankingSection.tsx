import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

interface RankingSectionProps {
  titles: string[];
}

const sectionRoutes = ['/best-sellers', '/most-viewed/30days', '/most-viewed/daily'];

const rankColors = ['bg-sunburst', 'bg-ash/30', 'bg-ember/20'];
const rankTextColors = ['text-deep-amber', 'text-graphite', 'text-ember'];
const barColors = ['bg-sunburst', 'bg-sky-accent', 'bg-ember/40', 'bg-stone-surface', 'bg-meadow/40'];
const coverColors = ['bg-amber-200', 'bg-sky-200', 'bg-violet-200', 'bg-amber-100', 'bg-emerald-200'];

export function RankingSection({ titles }: RankingSectionProps) {
  const sections = [
    {
      header: titles[0] ?? 'Best sellers',
      type: 'Last 30 days • Top 5',
      rows: ['Atomic Habits', 'Ikigai', 'The Almanack', 'Emotional Intelligence', 'How to Talk to Anyone', 'Who Moved My Cheese', 'The Psychology of Money', 'House of Stars', 'Charles Dickens', 'Curveball'],
    },
    {
      header: titles[1] ?? 'Most viewed this month',
      type: 'Last 30 days • Top 5',
      rows: ['10X Rules', 'Rich Dad Poor Dad', 'Still Like an Artist', 'The Subtle Art', 'Aurelius Clements', 'How to Keep Your Cool', 'Atomic Habits', 'Ikigai', 'The Almanack', 'Emotional Intelligence'],
    },
    {
      header: titles[2] ?? 'Trending today',
      type: 'Today • Top 5',
      rows: ['Aurelius Clements', 'House of Stars', 'Curveball', 'Dám Nghĩ Lớn', 'Đắc Nhân Tâm'],
    },
  ];

  return (
    <section className="mx-auto max-w-page px-6 pt-16 pb-16 lg:px-10 xl:px-24">
      {/* Section heading — Inter 44px/600 */}
      <div className="mb-8 flex items-end justify-between gap-4">
        <div>
          <h2 className="font-inter text-[44px] font-semibold leading-[1.09] tracking-[-1.14px] text-midnight">Ranking board</h2>
        </div>
        <Link className="inline-flex items-center gap-2 text-[14px] font-medium tracking-[-0.18px] text-ember transition hover:text-ember/80" href="/best-sellers">
          See all
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      {/* Ranking card — white with inset stone border */}
      <div
        className="rounded-cards-lg bg-white p-6 md:p-8"
        style={{ boxShadow: 'var(--shadow-subtle)' }}
      >
        <div className="grid gap-10 lg:grid-cols-3 lg:gap-12">
          {sections.map((section, sectionIndex) => (
            <div key={section.header} className="flex flex-col">
              <div className="mb-6">
                <Link href={sectionRoutes[sectionIndex]} className="group flex flex-col gap-1.5">
                  <h3 className="text-[19px] font-semibold tracking-[-0.25px] text-charcoal transition group-hover:text-ember">{section.header}</h3>
                  <p className="text-[13px] tracking-[-0.17px] text-ash">{section.type}</p>
                </Link>
              </div>
              <div className="flex flex-col">
                {section.rows.slice(0, 5).map((row, index) => (
                  <Link key={row} href={`/books/${row.toLowerCase().replace(/ /g, '-')}`} className={`group flex items-center gap-4 py-4 ${index !== 4 ? 'border-b border-stone-surface' : ''}`}>
                    {/* Rank badge */}
                    <div className="flex w-6 shrink-0 justify-center">
                      {index < 3 ? (
                        <div className={`flex h-7 w-7 items-center justify-center rounded-full ${rankColors[index]} text-[13px] font-semibold ${rankTextColors[index]}`}>
                          {index + 1}
                        </div>
                      ) : (
                        <span className="text-[15px] font-medium text-ash">{index + 1}</span>
                      )}
                    </div>

                    {/* Book cover placeholder */}
                    <div className={`h-14 w-10 shrink-0 rounded-sm ${coverColors[index % 5]}`} />

                    {/* Title + bar */}
                    <div className="flex flex-1 flex-col justify-center gap-2">
                      <p className="line-clamp-1 text-[15px] font-medium tracking-[-0.2px] text-charcoal group-hover:text-ember transition">{row}</p>
                      <div className="flex h-1.5 w-full items-center rounded-full bg-parchment">
                        <div
                          className={`h-1.5 rounded-full ${barColors[index % 5]}`}
                          style={{ width: `${Math.max(20, 95 - index * 15)}%` }}
                        />
                      </div>
                    </div>

                    {/* Score */}
                    <div className="shrink-0 pt-6 text-[13px] tracking-[-0.17px] text-ash">
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
