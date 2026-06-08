import type { Metadata } from 'next';
import Link from 'next/link';
import { ServerCache } from '@/lib/server-cache';

const SITE_URL = 'https://morning-briefing-mocha.vercel.app';

// ISR — 1시간 재생성
export const revalidate = 3600;

export const metadata: Metadata = {
  title: '아침 브리핑 아카이브 — 매일의 경제·투자·생활 뉴스 요약',
  description:
    'AI가 매일 아침 정리한 한국 경제·투자·생활/테크 뉴스 요약을 날짜별로 모아둔 아카이브. 출근길 3분 안에 그날의 핵심 뉴스를 확인하세요.',
  keywords: ['경제뉴스', '투자뉴스', 'AI 뉴스 요약', '아침 브리핑', '뉴스 아카이브', '오늘의 경제'],
  alternates: { canonical: `${SITE_URL}/archive` },
  openGraph: {
    title: '아침 브리핑 아카이브',
    description: 'AI가 매일 아침 정리한 한국 경제·투자·생활 뉴스 요약 아카이브',
    url: `${SITE_URL}/archive`,
    type: 'website',
    locale: 'ko_KR',
  },
};

function formatKoreanDate(iso: string): string {
  const [y, m, d] = iso.split('-').map((n) => parseInt(n, 10));
  return `${y}년 ${m}월 ${d}일`;
}

function dayOfWeek(iso: string): string {
  const dt = new Date(`${iso}T00:00:00+09:00`);
  return ['일', '월', '화', '수', '목', '금', '토'][dt.getDay()];
}

export default async function ArchiveIndexPage() {
  // economy 카테고리만 활성 — 해당 archive 날짜 집계
  const econDates = await ServerCache.listArchiveDates('economy', 365);
  const allDates = Array.from(new Set(econDates))
    .sort((a, b) => b.localeCompare(a))
    .slice(0, 90);

  // 월별 그룹핑
  const byMonth = new Map<string, string[]>();
  for (const date of allDates) {
    const monthKey = date.slice(0, 7); // YYYY-MM
    if (!byMonth.has(monthKey)) byMonth.set(monthKey, []);
    byMonth.get(monthKey)!.push(date);
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-6 pb-12">
      <header className="mb-6">
        <Link href="/" className="text-sm text-gray-500 dark:text-gray-400 hover:underline">
          ← 홈
        </Link>
        <h1 className="mt-3 text-2xl font-bold text-gray-900 dark:text-gray-100">
          아침 브리핑 아카이브
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          날짜별로 그날의 경제/시사 뉴스 요약을 다시 볼 수 있어요
        </p>
      </header>

      {allDates.length === 0 ? (
        <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-[#1c1c1e] p-8 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            아직 아카이브된 브리핑이 없어요.
          </p>
          <Link
            href="/"
            className="inline-block mt-4 px-5 py-2.5 rounded-xl bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-sm font-semibold"
          >
            오늘 브리핑 보기 →
          </Link>
        </div>
      ) : (
        <div className="space-y-8">
          {Array.from(byMonth.entries()).map(([monthKey, dates]) => {
            const [y, m] = monthKey.split('-').map((n) => parseInt(n, 10));
            return (
              <section key={monthKey}>
                <h2 className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-3 px-1">
                  {y}년 {m}월
                </h2>
                <ul className="space-y-2">
                  {dates.map((date) => (
                    <li key={date}>
                      <Link
                        href={`/archive/${date}`}
                        className="block rounded-xl bg-white dark:bg-[#1c1c1e] border border-gray-100 dark:border-gray-800 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                            {formatKoreanDate(date)} ({dayOfWeek(date)})
                          </span>
                          <span className="text-gray-400 text-sm">→</span>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}

      <aside className="mt-12 p-6 rounded-2xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40 text-center">
        <p className="text-base font-bold text-gray-900 dark:text-gray-100 mb-2">
          매일 아침 자동으로 받아보세요
        </p>
        <Link
          href="/"
          className="inline-block mt-2 px-6 py-3 rounded-xl bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 font-semibold text-sm"
        >
          오늘의 브리핑 보기 →
        </Link>
      </aside>
    </main>
  );
}
