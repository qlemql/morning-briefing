import { NextRequest, NextResponse } from 'next/server';
import { createHmac } from 'crypto';
import { generateBriefing } from '@/lib/claude';
import { ServerCache } from '@/lib/server-cache';
import { ApiResponse, BriefingCategory } from '@/lib/types';

/**
 * HMAC-SHA256 기반 unlock 토큰 검증
 * 시크릿: CRON_SECRET 환경변수 재활용 (별도 시크릿 불필요)
 */
function verifyUnlockToken(token: string, date: string, category: string): boolean {
  const secret = process.env.CRON_SECRET || 'default-dev-secret';
  const expected = createHmac('sha256', secret)
    .update(`mb_${date}_${category}`)
    .digest('hex')
    .substring(0, 32);
  return token === expected;
}

/**
 * unlock 토큰 생성 (클라이언트에 전달용)
 */
export function generateUnlockToken(date: string, category: string): string {
  const secret = process.env.CRON_SECRET || 'default-dev-secret';
  return createHmac('sha256', secret)
    .update(`mb_${date}_${category}`)
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
  console.error(`[${context}]`, error);

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
    const body = await request.json();
    const { category, date } = body;

    // Validate category
    if (!category || !['economy', 'investment'].includes(category)) {
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
            message: 'Category must be "economy" or "investment"',
          },
        },
        { status: 400 },
      );
    }

    // Use provided date or today (KST)
    const targetDate = date || new Date(Date.now() + 9 * 3600 * 1000).toISOString().split('T')[0];

    // Server-side cache + request deduplication
    const briefing = await ServerCache.getOrGenerate(
      category,
      targetDate,
      () => generateBriefing(category, targetDate),
    );

    // Check HMAC-signed unlock token
    const unlockToken = request.headers.get('x-unlock-token') || '';
    const isUnlocked = unlockToken !== '' && verifyUnlockToken(unlockToken, targetDate, category);

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

    return NextResponse.json(
      {
        meta: {
          version: '1.0',
          status: 'success',
          processingTimeMs: Date.now() - startTime,
          unlocked: isUnlocked,
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
    const today = new Date(Date.now() + 9 * 3600 * 1000).toISOString().split('T')[0];
    const tokens: Record<string, string> = {};
    for (const cat of ['economy', 'investment']) {
      tokens[cat] = generateUnlockToken(today, cat);
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
