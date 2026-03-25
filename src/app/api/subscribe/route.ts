import { NextRequest, NextResponse } from 'next/server';
import { kvSadd, kvScard, kvSmembers } from '@/lib/kv';
import { rateLimitSubscribe } from '@/lib/rate-limit';

const SUBSCRIBERS_KEY = 'mb:subscribers';

/**
 * POST /api/subscribe — collect email for newsletter
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Rate limit: 3 per hour per IP
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      request.headers.get('x-real-ip') ||
      'unknown';
    const rl = await rateLimitSubscribe(ip);
    if (!rl.success) {
      return NextResponse.json(
        { error: 'Too many requests' },
        { status: 429, headers: { 'Retry-After': '3600' } },
      );
    }

    const body = await request.json();
    const { email } = body;

    if (
      !email ||
      typeof email !== 'string' ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    ) {
      return NextResponse.json({ error: 'Invalid email' }, { status: 400 });
    }

    const normalized = email.trim().toLowerCase();
    await kvSadd(SUBSCRIBERS_KEY, normalized);
    const count = await kvScard(SUBSCRIBERS_KEY);

    console.log(`[Subscribe] ${normalized} (total: ${count})`);
    return NextResponse.json({ ok: true, count }, { status: 200 });
  } catch {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }
}

/**
 * GET /api/subscribe — view subscriber list (protected)
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const secret = request.nextUrl.searchParams.get('secret');
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const [count, emails] = await Promise.all([
    kvScard(SUBSCRIBERS_KEY),
    kvSmembers(SUBSCRIBERS_KEY),
  ]);

  return NextResponse.json({ count, emails });
}
