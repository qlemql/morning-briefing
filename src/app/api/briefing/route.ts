import { NextRequest, NextResponse } from 'next/server';
import { createHmac, createHash } from 'crypto';
import { ServerCache } from '@/lib/server-cache';
import { ApiResponse, BriefingCategory } from '@/lib/types';
import { rateLimitBriefing } from '@/lib/rate-limit';
import { isUnlocked as checkUserUnlocked } from '@/lib/user';
import { kvGet } from '@/lib/kv';

export const maxDuration = 60;

/**
 * 검수 승인 상태 확인
 * 06:50 KST 이후면 자동 승인, 그 전이면 Redis에서 승인 상태 체크
 */
async function checkReviewApproval(date: string, category: string): Promise<boolean> {
  // 06:50 KST 이후면 자동 승인 (타임아웃)
  const now = new Date(Date.now() + 9 * 3600 * 1000);
  const hours = now.getUTCHours();
  const minutes = now.getUTCMinutes();
  if (hours > 6 || (hours === 6 && minutes >= 50)) {
    return true;
  }

  // Redis에서 승인 상태 확인
  try {
    const status = await kvGet(`mb:review:${date}:${category}`);
    return status === 'approved';
  } catch {
    // Redis 미연결 시 승인된 것으로 처리 (서비스 안정성 우선)
    return true;
  }
}

/**
 * 미승인 카테고리용: evergreen fallback 반환
 * 실제 생성된 브리핑이 있어도 미승인이면 evergreen을 서빙
 */
async function getEvergreenOrCached(category: string, date: string): Promise<BriefingCategory> {
  const { getEvergreenBriefing } = await import('@/data/evergreen');
  const fallback = getEvergreenBriefing(category, date);
  if (fallback) return fallback;
  // fallback이 없으면 실제 캐시에서 가져옴 (안전장치)
  return ServerCache.getOnly(category, date);
}

/**
 * HMAC-SHA256 기반 unlock 토큰 검증
 * 시크릿: CRON_SECRET 환경변수 재활용 (별도 시크릿 불필요)
 */
function verifyUnlockToken(token: string, date: string, category: string, userId: string): boolean {
  const secret = process.env.CRON_SECRET || 'default-dev-secret';
  const expected = createHmac('sha256', secret)
    .update(`mb_${date}_${category}_${userId}`)
    .digest('hex')
    .substring(0, 32);
  return token === expected;
}

/**
 * unlock 토큰 생성 (클라이언트에 전달용, user-bound)
 */
export function generateUnlockToken(date: string, category: string, userId: string): string {
  const secret = process.env.CRON_SECRET || 'default-dev-secret';
  return createHmac('sha256', secret)
    .update(`mb_${date}_${category}_${userId}`)
    .digest('hex')
    .substring(0, 32);
}

/**
 * Error scenario handlers
 */

function handleError(
  error: unknown,
  context: string,
): {
  code: string;
  message: string;
  status: number;
} {
  const errMsg = error instanceof Error ? error.message : String(error);
  const errStack = error instanceof Error ? error.stack?.split('\n').slice(0, 3).join(' → ') : '';
  console.error(`[${context}] ${errMsg}`, errStack ? `| Stack: ${errStack}` : '');

  // API Error (5xx)
  if (
    typeof error === 'object' &&
    error !== null &&
    'status' in error &&
    typeof (error as Record<string, unknown>).status === 'number'
  ) {
    const status = (error as Record<string, unknown>).status as number;
    if (status >= 500) {
      return {
        code: `HTTP_${status}`,
        message: 'Claude API server error',
        status: 503,
      };
    }
    // 401 Unauthorized
    if (status === 401) {
      return {
        code: 'INVALID_API_KEY',
        message: 'Invalid API key',
        status: 401,
      };
    }
    // 429 Rate Limited
    if (status === 429) {
      return {
        code: 'RATE_LIMITED',
        message: 'API rate limit exceeded',
        status: 429,
      };
    }
  }

  // Budget exceeded
  if (error instanceof Error && error.message.includes('budget')) {
    return {
      code: 'BUDGET_EXCEEDED',
      message: 'Daily API budget exceeded',
      status: 429,
    };
  }

  // Network error
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return {
      code: 'NETWORK_ERROR',
      message: 'Network request failed',
      status: 503,
    };
  }

  // Generic error
  return {
    code: 'GENERATION_ERROR',
    message: 'Failed to generate briefing',
    status: 500,
  };
}

/**
 * POST /api/briefing
 * Generate a briefing for a specific category
 */
export async function POST(
  request: NextRequest,
): Promise<NextResponse<ApiResponse<BriefingCategory>>> {
  const startTime = Date.now();

  try {
    // Rate limiting
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      request.headers.get('x-real-ip') ||
      'unknown';
    const rl = await rateLimitBriefing(ip);
    if (!rl.success) {
      return NextResponse.json(
        {
          meta: { version: '1.0', status: 'error', message: 'Rate limited' },
          error: { code: 'RATE_LIMITED', message: 'Too many requests' },
        },
        {
          status: 429,
          headers: { 'Retry-After': '60' },
        },
      );
    }

    const body = await request.json();
    const { category, date } = body;

    // Validate category
    if (!category || !['economy', 'investment', 'lifestyle'].includes(category)) {
      return NextResponse.json(
        {
          meta: {
            version: '1.0',
            status: 'error',
            message: 'Invalid category',
            processingTimeMs: Date.now() - startTime,
          },
          error: {
            code: 'INVALID_CATEGORY',
            message: 'Category must be "economy", "investment", or "lifestyle"',
          },
        },
        { status: 400 },
      );
    }

    // Use provided date or today (KST)
    const targetDate = date || new Date(Date.now() + 9 * 3600 * 1000).toISOString().split('T')[0];

    // Review approval check: serve evergreen if not approved and before auto-publish time
    const isApproved = await checkReviewApproval(targetDate, category);

    // Cache-only lookup (no API generation — generation is cron-only)
    // If not approved, getOnly will still return evergreen fallback naturally,
    // but we force evergreen for unapproved categories
    const briefing = isApproved
      ? await ServerCache.getOnly(category, targetDate)
      : await getEvergreenOrCached(category, targetDate);

    // Derive userId for token verification and server-side unlock check
    const ua = request.headers.get('user-agent') || '';
    const userId = createHash('sha256')
      .update(`${ip}_${ua}`)
      .digest('hex')
      .substring(0, 16);

    // Check HMAC-signed unlock token OR server-side unlock status (trial/donation)
    const unlockToken = request.headers.get('x-unlock-token') || '';
    const isUnlocked =
      (unlockToken !== '' && verifyUnlockToken(unlockToken, targetDate, category, userId)) ||
      (await checkUserUnlocked(userId));

    // Server-side content gating: strip card 2-3 content for non-unlocked users
    const gatedBriefing = {
      ...briefing,
      cards: briefing.cards.map((card) => {
        if (card.number === 1 || isUnlocked) return card;
        // Premium cards: keep title, summary, metadata but strip content
        return {
          ...card,
          content: '',
        };
      }),
    };

    // Detect evergreen fallback by id prefix
    const isFallback = briefing.cards.some((card) => card.id.startsWith('eg_'));

    return NextResponse.json(
      {
        meta: {
          version: '1.0',
          status: 'success',
          processingTimeMs: Date.now() - startTime,
          unlocked: isUnlocked,
          ...(isFallback && { fallback: true }),
        },
        data: gatedBriefing,
      },
      {
        status: 200,
        headers: {
          // CDN cache: 30min for same request, stale-while-revalidate for 1hr
          'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=3600',
        },
      },
    );
  } catch (error) {
    const { code, message, status } = handleError(error, 'POST /api/briefing');

    return NextResponse.json(
      {
        meta: {
          version: '1.0',
          status: 'error',
          message,
          processingTimeMs: Date.now() - startTime,
        },
        error: {
          code,
          message,
        },
      },
      { status },
    );
  }
}

/**
 * GET /api/briefing?action=unlock
 * - action=unlock: 페이월 통과 후 unlock 토큰 발급
 * - default: Health check
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const action = request.nextUrl.searchParams.get('action');

  if (action === 'unlock') {
    // Verify user is actually unlocked (Redis) before issuing HMAC tokens
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const ua = request.headers.get('user-agent') || '';
    const userId = createHash('sha256')
      .update(`${ip.split(',')[0].trim()}_${ua}`)
      .digest('hex')
      .substring(0, 16);

    const userUnlocked = await checkUserUnlocked(userId);
    if (!userUnlocked) {
      return NextResponse.json(
        {
          meta: { version: '1.0', status: 'error', message: 'Not unlocked' },
          error: { code: 'NOT_UNLOCKED', message: 'Complete the unlock flow first' },
        },
        { status: 403 },
      );
    }

    const today = new Date(Date.now() + 9 * 3600 * 1000).toISOString().split('T')[0];
    const tokens: Record<string, string> = {};
    for (const cat of ['economy', 'investment', 'lifestyle']) {
      tokens[cat] = generateUnlockToken(today, cat, userId);
    }
    return NextResponse.json(
      {
        meta: { version: '1.0', status: 'success' },
        data: { date: today, tokens },
      },
      { status: 200 },
    );
  }

  return NextResponse.json(
    {
      meta: {
        version: '1.0',
        status: 'success',
        message: 'Briefing API ready',
      },
      data: {
        available: true,
        cache: ServerCache.getStats(),
      },
    },
    { status: 200 },
  );
}
