import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ServerCache } from '@/lib/server-cache';
import { CATEGORIES } from '@/constants';
import type { BriefingCategory, BriefingCard } from '@/lib/types';

const CATEGORY_IDS = ['economy', 'investment', 'lifestyle'] as const;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const SITE_URL = 'https://morning-briefing-mocha.vercel.app';

// 페이지를 ISR로 — 1시간마다 재생성, 그 사이엔 캐시 서빙
export const revalidate = 3600;

interface PageProps {
  params: Promise<{ date: string }>;
}

function formatKoreanDate(iso: string): string {
  const [y, m, d] = iso.split('-').map((n) => parseInt(n, 10));
  return `${y}년 ${m}월 ${d}일`;
}

function dayOfWeek(iso: string): string {
  const dt = new Date(`${iso}T00:00:00+09:00`);
  return ['일', '월', '화', '수', '목', '금', '토'][dt.getDay()];
}

async function getBriefingsForDate(date: string): Promise<Record<string, BriefingCategory | null>> {
  const result: Record<string, BriefingCategory | null> = {};
  await Promise.all(
    CATEGORY_IDS.map(async (cat) => {
      result[cat] = await ServerCache.getArchive(cat, date);
    }),
  );
  return result;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { date } = await params;
  if (!DATE_RE.test(date)) return { title: '아카이브 — 아침 브리핑' };

  const briefings = await getBriefingsForDate(date);
  const heroCard = briefings.economy?.cards?.[0];
  const koreanDate = formatKoreanDate(date);
  const title = heroCard
    ? `${koreanDate} ${heroCard.title} — 아침 브리핑`
    : `${koreanDate} 경제·투자·생활 뉴스 요약 — 아침 브리핑`;
  const description = heroCard?.summary
    || `${koreanDate} AI가 정리한 한국 경제·투자·생활/테크 핵심 뉴스. 출근길 3분 안에 오늘 꼭 알아야 할 정보.`;
  const canonical = `${SITE_URL}/archive/${date}`;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      type: 'article',
      locale: 'ko_KR',
      publishedTime: `${date}T00:00:00+09:00`,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  };
}

function CardBlock({ card, categoryName }: { card: BriefingCard; categoryName: string }) {
  return (
    <article className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-[#1c1c1e] p-6 mb-4">
      <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">
        {categoryName} · {card.type}
      </div>
      <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2 leading-snug">
        {card.title}
      </h3>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 leading-relaxed">
        {card.summary}
      </p>
      <div className="text-[15px] text-gray-700 dark:text-gray-300 leading-7 whitespace-pre-line">
        {card.content}
      </div>
      {card.beginnerExplanation && (
        <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-1">
            한 마디로
          </p>
          <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-3">
            {card.beginnerExplanation.tldr}
          </p>
          {card.beginnerExplanation.glossary && card.beginnerExplanation.glossary.length > 0 && (
            <div className="mt-3">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-2">
                용어 풀이
              </p>
              <ul className="space-y-1.5">
                {card.beginnerExplanation.glossary.map((g, i) => (
                  <li key={i} className="text-[13px] text-gray-700 dark:text-gray-300">
                    <span className="font-bold">{g.term}</span>
                    <span className="text-gray-500 dark:text-gray-400 ml-2">{g.explain}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
      {card.source && (
        <div className="mt-4 text-xs text-gray-400 dark:text-gray-500">
          출처:{' '}
          {card.sourceUrl ? (
            <a
              href={card.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-gray-600"
            >
              {card.source} ↗
            </a>
          ) : card.source}
        </div>
      )}
    </article>
  );
}

export default async function ArchiveDatePage({ params }: PageProps) {
  const { date } = await params;
  if (!DATE_RE.test(date)) notFound();

  const briefings = await getBriefingsForDate(date);
  const hasAny = Object.values(briefings).some((b) => b !== null);
  if (!hasAny) notFound();

  const koreanDate = formatKoreanDate(date);
  const dow = dayOfWeek(date);

  // JSON-LD: NewsArticle / Article schema
  const heroCard = briefings.economy?.cards?.[0] || briefings.investment?.cards?.[0] || briefings.lifestyle?.cards?.[0];
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: heroCard?.title || `${koreanDate} 아침 브리핑`,
    description: heroCard?.summary || '',
    datePublished: `${date}T06:00:00+09:00`,
    dateModified: `${date}T06:50:00+09:00`,
    author: { '@type': 'Organization', name: '아침 브리핑' },
    publisher: {
      '@type': 'Organization',
      name: '아침 브리핑',
      url: SITE_URL,
      logo: { '@type': 'ImageObject', url: `${SITE_URL}/icon-512.png` },
    },
    inLanguage: 'ko-KR',
    mainEntityOfPage: { '@type': 'WebPage', '@id': `${SITE_URL}/archive/${date}` },
  };

  return (
    <main className="mx-auto max-w-2xl px-4 py-6 pb-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* 헤더 */}
      <header className="mb-6">
        <Link
          href="/archive"
          className="text-sm text-gray-500 dark:text-gray-400 hover:underline"
        >
          ← 전체 아카이브
        </Link>
        <h1 className="mt-3 text-2xl font-bold text-gray-900 dark:text-gray-100">
          {koreanDate} ({dow}) 아침 브리핑
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          AI가 정리한 그날의 경제·투자·생활/테크 핵심 뉴스
        </p>
      </header>

      {/* 카테고리별 카드 */}
      {CATEGORY_IDS.map((catId) => {
        const briefing = briefings[catId];
        if (!briefing) return null;
        const categoryMeta = CATEGORIES.find((c) => c.id === catId);
        return (
          <section key={catId} className="mb-8">
            <h2 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-3 px-1">
              {categoryMeta?.name || catId}
            </h2>
            {briefing.cards.map((card) => (
              <CardBlock
                key={card.id}
                card={card}
                categoryName={categoryMeta?.name || catId}
              />
            ))}
          </section>
        );
      })}

      {/* 앱 다운로드 CTA */}
      <aside className="mt-10 p-6 rounded-2xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40 text-center">
        <p className="text-base font-bold text-gray-900 dark:text-gray-100 mb-2">
          매일 아침 자동으로 받아보세요
        </p>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          AI가 매일 아침 카드 3장으로 정리해드립니다 · 무료
        </p>
        <Link
          href="/"
          className="inline-block px-6 py-3 rounded-xl bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 font-semibold text-sm"
        >
          오늘의 브리핑 보기 →
        </Link>
      </aside>

      {/* 푸터 네비 */}
      <nav className="mt-8 text-center text-sm">
        <Link
          href="/archive"
          className="text-gray-500 dark:text-gray-400 hover:underline"
        >
          전체 아카이브 보기
        </Link>
        {' · '}
        <Link href="/" className="text-gray-500 dark:text-gray-400 hover:underline">
          홈
        </Link>
      </nav>
    </main>
  );
}
