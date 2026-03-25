import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { trackPageView, trackEvent, getStats, getAllStats } from '@/lib/analytics';
import { getBudgetStatus } from '@/lib/budget';

/**
 * POST /api/analytics — track events from client
 * Body: { event: 'page_view' | 'share' | 'paywall_click' | 'unlock', category?: string }
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { event, category } = body;

    // Simple visitor ID from IP + user-agent hash
    const ip =
      request.headers.get('x-forwarded-for') ||
      request.headers.get('x-real-ip') ||
      'unknown';
    const ua = request.headers.get('user-agent') || '';
    const visitorId = createHash('sha256')
      .update(`${ip.split(',')[0].trim()}_${ua}`)
      .digest('hex')
      .substring(0, 12);

    if (event === 'page_view') {
      await trackPageView(visitorId, category);
    } else if (['share', 'paywall_click', 'unlock', 'email_subscribed'].includes(event)) {
      await trackEvent(event);
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}

/**
 * GET /api/analytics — view stats (protected by CRON_SECRET)
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const secret = request.nextUrl.searchParams.get('secret');
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const date = request.nextUrl.searchParams.get('date') || undefined;
  const [stats, budget] = await Promise.all([
    date ? getStats(date) : getStats(),
    getBudgetStatus(),
  ]);
  const data = date
    ? stats
    : { today: stats, history: await getAllStats(), budget };

  return NextResponse.json({ data }, { status: 200 });
}
