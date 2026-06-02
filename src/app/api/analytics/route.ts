import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { trackPageView, trackEvent, getStats, getAllStats } from '@/lib/analytics';
import { getBudgetStatus } from '@/lib/budget';
import { getCronStatus } from '@/lib/cron-status';

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
    } else if (['share', 'share_app', 'copy_briefing', 'source_click', 'paywall_click', 'unlock', 'email_subscribed', 'card_toggle', 'pwa_installed', 'pwa_install_click', 'notif_subscribed', 'notif_subscribe_click', 'web_vital', 'client_error'].includes(event)) {
      await trackEvent(event);
    }

    return NextResponse.json(
      { meta: { version: '1.0', status: 'success' }, data: { tracked: true } },
      { status: 200 },
    );
  } catch {
    return NextResponse.json(
      {
        meta: { version: '1.0', status: 'error' },
        error: { code: 'TRACKING_FAILED', message: 'Failed to track event' },
      },
      { status: 400 },
    );
  }
}

/**
 * GET /api/analytics — view stats (protected by CRON_SECRET)
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const secret = request.nextUrl.searchParams.get('secret')
    || request.headers.get('authorization')?.replace('Bearer ', '') || null;
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json(
      {
        meta: { version: '1.0', status: 'error' },
        error: { code: 'UNAUTHORIZED', message: 'Unauthorized' },
      },
      { status: 401 },
    );
  }

  const date = request.nextUrl.searchParams.get('date') || undefined;
  const todayKST = new Date(Date.now() + 9 * 3600 * 1000).toISOString().split('T')[0];
  const [stats, budget, cron] = await Promise.all([
    date ? getStats(date) : getStats(),
    getBudgetStatus(),
    getCronStatus(todayKST),
  ]);
  const data = date
    ? stats
    : { today: stats, history: await getAllStats(), budget, cron };

  return NextResponse.json(
    { meta: { version: '1.0', status: 'success' }, data },
    { status: 200 },
  );
}
