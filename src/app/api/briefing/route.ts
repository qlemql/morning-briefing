import { NextRequest, NextResponse } from 'next/server';
import { generateBriefing } from '@/lib/claude';
import { ServerCache } from '@/lib/server-cache';
import { ApiResponse, BriefingCategory } from '@/lib/types';

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

    return NextResponse.json(
      {
        meta: {
          version: '1.0',
          status: 'success',
          processingTimeMs: Date.now() - startTime,
        },
        data: briefing,
      },
      { status: 200 },
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
 * GET /api/briefing
 * Health check / endpoint info
 */
export async function GET(): Promise<NextResponse<ApiResponse<{ available: boolean; cache: ReturnType<typeof ServerCache.getStats> }>>> {
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
