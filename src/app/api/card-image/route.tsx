import { ImageResponse } from 'next/og';
import type { BriefingCategory } from '@/lib/types';

export const runtime = 'edge';

/* ---------- Category config ---------- */

type CategoryKey = 'economy' | 'investment' | 'lifestyle';

const CATEGORY_CONFIG: Record<
  CategoryKey,
  { name: string; gradient: string; accent: string }
> = {
  economy: {
    name: '경제/시사',
    gradient: 'linear-gradient(135deg, #1e3a5f 0%, #2563eb 50%, #1d4ed8 100%)',
    accent: '#60a5fa',
  },
  investment: {
    name: '투자',
    gradient: 'linear-gradient(135deg, #78350f 0%, #d97706 50%, #b45309 100%)',
    accent: '#fbbf24',
  },
  lifestyle: {
    name: '생활/테크',
    gradient: 'linear-gradient(135deg, #064e3b 0%, #059669 50%, #047857 100%)',
    accent: '#34d399',
  },
};

/* ---------- Fetch briefing from Redis ---------- */

async function fetchBriefingFromRedis(
  category: string,
  date: string,
): Promise<BriefingCategory | null> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;

  try {
    const redisKey = `mb:briefing:${category}:${date}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(['GET', redisKey]),
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.result) return null;
    return JSON.parse(data.result) as BriefingCategory;
  } catch {
    return null;
  }
}

/* ---------- Helpers ---------- */

function getKSTDate(): string {
  const now = new Date(Date.now() + 9 * 3600 * 1000);
  return now.toISOString().slice(0, 10);
}

function formatDateKorean(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00+09:00');
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
  const weekday = weekdays[d.getDay()];
  return `${month}월 ${day}일 ${weekday}요일`;
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max - 1) + '...';
}

/* ---------- GET handler ---------- */

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = (searchParams.get('category') || 'economy') as CategoryKey;
  const cardIndex = parseInt(searchParams.get('card') || '1', 10);
  const date = searchParams.get('date') || getKSTDate();

  // Validate category
  const config = CATEGORY_CONFIG[category];
  if (!config) {
    return new Response('Invalid category. Use: economy, investment, lifestyle', {
      status: 400,
    });
  }

  // Validate card index
  if (cardIndex < 1 || cardIndex > 3) {
    return new Response('Invalid card index. Use: 1, 2, or 3', { status: 400 });
  }

  // Fetch briefing data
  const briefing = await fetchBriefingFromRedis(category, date);
  const card = briefing?.cards?.[cardIndex - 1];

  // Fallback if no data
  const title = card?.title || '브리핑 준비 중';
  const summary = card?.summary || '아직 오늘의 브리핑이 생성되지 않았습니다.';
  const source = card?.source || '';
  const cardType = card?.type || '오늘의핵심';
  const dateLabel = formatDateKorean(date);

  return new ImageResponse(
    (
      <div
        style={{
          width: '1200px',
          height: '630px',
          display: 'flex',
          flexDirection: 'column',
          background: config.gradient,
          fontFamily: 'sans-serif',
          padding: '0',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Subtle background decoration */}
        <div
          style={{
            position: 'absolute',
            top: '-100px',
            right: '-100px',
            width: '400px',
            height: '400px',
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.05)',
            display: 'flex',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: '-150px',
            left: '-80px',
            width: '350px',
            height: '350px',
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.03)',
            display: 'flex',
          }}
        />

        {/* Content container */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            padding: '48px 60px',
            height: '100%',
            position: 'relative',
          }}
        >
          {/* Header row */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '12px',
            }}
          >
            {/* Logo + category */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div
                style={{
                  fontSize: '24px',
                  fontWeight: 800,
                  color: '#ffffff',
                  letterSpacing: '-0.5px',
                }}
              >
                아침 브리핑
              </div>
              <div
                style={{
                  background: 'rgba(255,255,255,0.15)',
                  color: config.accent,
                  padding: '6px 16px',
                  borderRadius: '100px',
                  fontSize: '16px',
                  fontWeight: 600,
                }}
              >
                {config.name}
              </div>
            </div>
            {/* Date */}
            <div
              style={{
                fontSize: '18px',
                color: 'rgba(255,255,255,0.6)',
              }}
            >
              {dateLabel}
            </div>
          </div>

          {/* Card type badge */}
          <div
            style={{
              display: 'flex',
              marginBottom: '24px',
              marginTop: '8px',
            }}
          >
            <div
              style={{
                background: config.accent,
                color: '#000000',
                padding: '6px 14px',
                borderRadius: '8px',
                fontSize: '15px',
                fontWeight: 700,
              }}
            >
              {`${cardIndex}. ${cardType}`}
            </div>
          </div>

          {/* Title */}
          <div
            style={{
              fontSize: '52px',
              fontWeight: 800,
              color: '#ffffff',
              lineHeight: 1.25,
              marginBottom: '24px',
              letterSpacing: '-1px',
            }}
          >
            {truncate(title, 25)}
          </div>

          {/* Summary */}
          <div
            style={{
              fontSize: '26px',
              color: 'rgba(255,255,255,0.8)',
              lineHeight: 1.6,
              flex: 1,
            }}
          >
            {truncate(summary, 80)}
          </div>

          {/* Footer */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderTop: '1px solid rgba(255,255,255,0.15)',
              paddingTop: '20px',
            }}
          >
            <div
              style={{
                fontSize: '16px',
                color: 'rgba(255,255,255,0.5)',
              }}
            >
              {source ? `출처: ${source}` : ''}
            </div>
            <div
              style={{
                fontSize: '16px',
                color: 'rgba(255,255,255,0.4)',
              }}
            >
              morning-briefing-mocha.vercel.app
            </div>
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      headers: {
        'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=86400',
      },
    },
  );
}
