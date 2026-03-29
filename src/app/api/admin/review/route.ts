import { NextRequest, NextResponse } from 'next/server';
import { kvGet, kvSet } from '@/lib/kv';
import { ServerCache } from '@/lib/server-cache';

const CATEGORIES = ['economy', 'investment', 'lifestyle'] as const;
type Category = (typeof CATEGORIES)[number];

/**
 * 오늘 날짜 (KST) 반환
 */
function getTodayKST(): string {
  return new Date(Date.now() + 9 * 3600 * 1000).toISOString().split('T')[0];
}

/**
 * Redis 키 생성: mb:review:{date}:{category}
 */
function reviewKey(date: string, category: string): string {
  return `mb:review:${date}:${category}`;
}

/**
 * 06:50 KST 자동 게시 타임아웃 체크
 * 현재 시각이 06:50 KST 이후면 true
 */
function isAutoPublishTime(): boolean {
  const now = new Date(Date.now() + 9 * 3600 * 1000);
  const hours = now.getUTCHours();
  const minutes = now.getUTCMinutes();
  return hours > 6 || (hours === 6 && minutes >= 50);
}

/**
 * 인증 체크 (CRON_SECRET)
 */
function authenticate(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;

  // Header 방식: Authorization: Bearer <secret>
  const authHeader = request.headers.get('authorization');
  if (authHeader === `Bearer ${secret}`) return true;

  // Query 방식: ?secret=<secret>
  const querySecret = request.nextUrl.searchParams.get('secret');
  if (querySecret === secret) return true;

  return false;
}

/**
 * GET /api/admin/review
 * 오늘의 브리핑 3개 카테고리의 승인 상태 + 카드 미리보기 조회
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  if (!authenticate(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const today = getTodayKST();
  const autoPublish = isAutoPublishTime();

  const results: Record<
    string,
    {
      status: 'approved' | 'pending';
      cards: Array<{ number: number; title: string; summary: string; content: string }>;
    }
  > = {};

  for (const category of CATEGORIES) {
    // 승인 상태 조회
    let status: 'approved' | 'pending' = 'pending';
    try {
      const stored = await kvGet(reviewKey(today, category));
      if (stored === 'approved' || autoPublish) {
        status = 'approved';
      }
    } catch {
      // Redis 장애 시 서비스 안정성 우선 — 승인 처리 (briefing/route.ts와 동일 정책)
      status = 'approved';
    }

    // 카드 미리보기 조회 (ServerCache에서)
    let cards: Array<{ number: number; title: string; summary: string; content: string }> = [];
    try {
      const briefing = await ServerCache.getOnly(category, today);
      const isFallback = briefing.cards.some((c) => c.id.startsWith('eg_'));
      cards = briefing.cards.map((card) => ({
        number: card.number,
        title: card.title,
        summary: card.summary,
        content: isFallback ? '[Evergreen fallback - 아직 생성되지 않음]' : card.content.slice(0, 200),
      }));
    } catch {
      // 브리핑 없음
    }

    results[category] = { status, cards };
  }

  return NextResponse.json({
    date: today,
    autoPublish,
    autoPublishTime: '06:50 KST',
    categories: results,
  });
}

/**
 * POST /api/admin/review
 * 카테고리별 승인/보류 상태 변경
 * Body: { category: string, action: "approve" | "pending" }
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  if (!authenticate(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { category, action } = body;

    if (!CATEGORIES.includes(category as Category)) {
      return NextResponse.json(
        { error: `Invalid category. Must be one of: ${CATEGORIES.join(', ')}` },
        { status: 400 },
      );
    }

    if (!['approve', 'pending'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be "approve" or "pending"' },
        { status: 400 },
      );
    }

    const today = getTodayKST();
    const key = reviewKey(today, category);
    const value = action === 'approve' ? 'approved' : 'pending';

    // Redis에 저장 (24시간 TTL)
    await kvSet(key, value, 86400);

    return NextResponse.json({
      success: true,
      date: today,
      category,
      status: value,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
