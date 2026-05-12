'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { recommendationsApi } from '@/lib/api/recommendations';
import { CommerceSection, CommercePanel } from '@/components/ui/commerce';

interface RankingSectionProps {
  titles: string[];
}

const sectionRoutes = ['/best-sellers', '/most-viewed/30days', '/most-viewed/daily'];

const rankColors = ['bg-sunburst', 'bg-ash/30', 'bg-ember/20'];
const rankTextColors = ['text-deep-amber', 'text-graphite', 'text-ember'];
const barColors = ['bg-sunburst', 'bg-sky-accent', 'bg-ember/40', 'bg-stone-surface', 'bg-meadow/40'];

export function RankingSection({ titles }: RankingSectionProps) {
  const [bestSellers, setBestSellers] = useState<any[] | null>(null);
  const [mostViewed30D, setMostViewed30D] = useState<any[] | null>(null);
  const [mostViewedDaily, setMostViewedDaily] = useState<any[] | null>(null);

  useEffect(() => {
    recommendationsApi.getBestSellers().then((data) => setBestSellers(data || [])).catch(() => setBestSellers([]));
    recommendationsApi.getTopMostViewed30Days().then((data) => setMostViewed30D(data || [])).catch(() => setMostViewed30D([]));
    recommendationsApi.getTopDailyViewed().then((data) => setMostViewedDaily(data || [])).catch(() => setMostViewedDaily([]));
  }, []);

  const sections = [
    {
      header: titles[0] ?? 'Sách bán chạy',
      type: '30 ngày gần nhất, Top 5',
      rows: bestSellers,
      getLabel: (item: any) => `${item.total_sold} đã bán`,
    },
    {
      header: titles[1] ?? 'Xem nhiều trong tháng',
      type: '30 ngày gần nhất, Top 5',
      rows: mostViewed30D,
      getLabel: (item: any) => `${item.view_count} lượt xem`,
    },
    {
      header: titles[2] ?? 'Đang hot hôm nay',
      type: 'Hôm nay, Top 5',
      rows: mostViewedDaily,
      getLabel: (item: any) => `${item.view_count} lượt xem`,
    },
  ];

  return (
    <CommerceSection className="pt-16">
      <div className="mb-8 flex items-end justify-between gap-4">
        <div>
          <p className="text-[12px] font-medium uppercase tracking-[0.18em] text-ember">Bảng xếp hạng</p>
          <h2 className="mt-2 text-[32px] font-semibold leading-tight text-charcoal md:text-[40px]">Đang được mua và xem nhiều</h2>
        </div>
        <Link className="inline-flex items-center gap-2 text-[14px] font-medium text-ember transition hover:text-coral-red" href="/best-sellers">
          Xem tất cả
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      {/* Ranking card — white with inset stone border */}
      <CommercePanel className="p-6 md:p-8">
        <div className="grid gap-10 lg:grid-cols-3 lg:gap-12">
          {sections.map((section, sectionIndex) => (
            <div key={section.header} className="flex flex-col">
              <div className="mb-6">
                <Link href={sectionRoutes[sectionIndex]} className="group flex flex-col gap-1.5">
                  <h3 className="text-[19px] font-medium text-charcoal transition group-hover:text-ember">{section.header}</h3>
                  <p className="text-[13px] tracking-[-0.17px] text-ash">{section.type}</p>
                </Link>
              </div>
              <div className="flex flex-col">
                {section.rows === null ? (
                  <div className="skeleton-shimmer h-20 rounded-cards bg-parchment" />
                ) : section.rows.length === 0 ? (
                  <div className="py-4 text-[15px] text-graphite">Chưa có dữ liệu</div>
                ) : (
                  section.rows.slice(0, 5).map((row, index) => (
                    <Link key={row.book_id} href={`/books/${row.book_id}`} className={`group flex items-center gap-4 py-4 ${index !== 4 ? 'border-b border-stone-surface' : ''}`}>
                      {/* Rank badge */}
                      <div className="flex w-6 shrink-0 justify-center">
                        {index < 3 ? (
                          <div className={`flex h-7 w-7 items-center justify-center rounded-full ${rankColors[index]} text-[13px] font-medium ${rankTextColors[index]}`}>
                            {index + 1}
                          </div>
                        ) : (
                          <span className="text-[15px] font-medium text-ash">{index + 1}</span>
                        )}
                      </div>

                      <div className="flex flex-1 flex-col justify-center gap-2">
                        <p className="line-clamp-1 text-[15px] font-medium text-charcoal transition group-hover:text-ember">{row.title}</p>
                        <div className="flex h-1.5 w-full items-center rounded-full bg-parchment">
                          <div
                            className={`h-1.5 rounded-full ${barColors[index % 5]}`}
                            style={{ width: `${Math.max(20, 95 - index * 15)}%` }}
                          />
                        </div>
                      </div>

                      {/* Score */}
                      <div className="shrink-0 pt-6 text-[13px] tracking-[-0.17px] text-ash whitespace-nowrap">
                        {section.getLabel(row)}
                      </div>
                    </Link>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      </CommercePanel>
    </CommerceSection>
  );
}
