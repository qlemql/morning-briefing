import { NextRequest, NextResponse } from 'next/server';
import { kvHincrby, kvHgetall, kvExpire } from '@/lib/kv';

/**
 * POST /api/quiz — Submit a quiz/poll response
 * Body: { date: string, questionId: string, optionIndex: number }
 *
 * GET /api/quiz?date=YYYY-MM-DD&questionId=xxx — Get aggregated results
 *
 * Redis key: mb:quiz:{date}:{questionId} (hash with field "opt0", "opt1", ...)
 * Rate limit: IP-based, 1 submission per question per IP.
 */

const RATE_LIMIT_KEY_PREFIX = 'mb:quiz:ip:';
const QUIZ_KEY_PREFIX = 'mb:quiz:';
const TTL_SECONDS = 7 * 24 * 3600; // 7 days

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  );
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { date, questionId, optionIndex } = body;

    // Validate
    if (!date || !questionId || optionIndex == null) {
      return NextResponse.json(
        {
          meta: { version: '1.0', status: 'error' },
          error: { code: 'MISSING_FIELDS', message: 'Missing required fields' },
        },
        { status: 400 },
      );
    }

    if (typeof optionIndex !== 'number' || optionIndex < 0 || optionIndex > 3) {
      return NextResponse.json(
        {
          meta: { version: '1.0', status: 'error' },
          error: { code: 'INVALID_OPTION', message: 'Invalid optionIndex' },
        },
        { status: 400 },
      );
    }

    // Date format validation (YYYY-MM-DD)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json(
        {
          meta: { version: '1.0', status: 'error' },
          error: { code: 'INVALID_DATE', message: 'Invalid date format' },
        },
        { status: 400 },
      );
    }

    // Rate limit: 1 response per IP per question per day
    const ip = getClientIp(request);
    const rateLimitKey = `${RATE_LIMIT_KEY_PREFIX}${date}:${questionId}:${ip}`;

    // Use HINCRBY on rate limit hash — if result > 1, already submitted
    const count = await kvHincrby(rateLimitKey, 'count', 1);
    if (count > 1) {
      // Already submitted — still return current results
      const quizKey = `${QUIZ_KEY_PREFIX}${date}:${questionId}`;
      const results = await kvHgetall(quizKey);
      return NextResponse.json(
        {
          meta: { version: '1.0', status: 'error' },
          error: { code: 'DUPLICATE', message: 'Already submitted' },
          data: { results },
        },
        { status: 409 },
      );
    }

    // Set TTL on rate limit key
    await kvExpire(rateLimitKey, TTL_SECONDS);

    // Increment the chosen option
    const quizKey = `${QUIZ_KEY_PREFIX}${date}:${questionId}`;
    await kvHincrby(quizKey, `opt${optionIndex}`, 1);
    await kvExpire(quizKey, TTL_SECONDS);

    // Return updated results
    const results = await kvHgetall(quizKey);

    return NextResponse.json({
      meta: { version: '1.0', status: 'success' },
      data: { results },
    });
  } catch (err) {
    console.error('[quiz] POST error:', err);
    return NextResponse.json(
      {
        meta: { version: '1.0', status: 'error' },
        error: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
      },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = request.nextUrl;
    const date = searchParams.get('date');
    const questionId = searchParams.get('questionId');

    if (!date || !questionId) {
      return NextResponse.json(
        {
          meta: { version: '1.0', status: 'error' },
          error: { code: 'MISSING_PARAMS', message: 'Missing date or questionId' },
        },
        { status: 400 },
      );
    }

    const quizKey = `${QUIZ_KEY_PREFIX}${date}:${questionId}`;
    const results = await kvHgetall(quizKey);

    return NextResponse.json(
      {
        meta: { version: '1.0', status: 'success' },
        data: { results },
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
        },
      },
    );
  } catch (err) {
    console.error('[quiz] GET error:', err);
    return NextResponse.json(
      {
        meta: { version: '1.0', status: 'error' },
        error: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
      },
      { status: 500 },
    );
  }
}
