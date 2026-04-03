import { NextRequest, NextResponse } from 'next/server';
import webpush from 'web-push';
import { kvSmembers, kvSrem } from '@/lib/kv';

const PUSH_KEY = 'mb:push:subscriptions';

/**
 * POST /api/push/send — Send push notification to all subscribers
 * Protected by CRON_SECRET. Called after briefing generation.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  // Auth check
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
  const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:hello@morningbriefing.co';

  if (!vapidPublicKey || !vapidPrivateKey) {
    return NextResponse.json({ error: 'VAPID keys not configured' }, { status: 500 });
  }

  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

  // Optional custom payload from request body
  let title = '아침 브리핑';
  let body = '오늘의 경제 브리핑이 도착했어요';
  let url = '/';
  try {
    const reqBody = await request.json();
    if (reqBody.title) title = reqBody.title;
    if (reqBody.body) body = reqBody.body;
    if (reqBody.url) url = reqBody.url;
  } catch {
    // No body provided, use defaults
  }

  const payload = JSON.stringify({ title, body, url });

  // Get all subscriptions
  const members = await kvSmembers(PUSH_KEY);
  if (members.length === 0) {
    return NextResponse.json({ sent: 0, failed: 0, total: 0 });
  }

  let sent = 0;
  let failed = 0;
  const staleEndpoints: string[] = [];

  // Send to all subscribers (in parallel, batched)
  const results = await Promise.allSettled(
    members.map(async (memberJson) => {
      try {
        const subscription = JSON.parse(memberJson);
        await webpush.sendNotification(subscription, payload);
        sent++;
      } catch (err: unknown) {
        failed++;
        // Remove stale subscriptions (410 Gone or 404)
        const statusCode = (err as { statusCode?: number }).statusCode;
        if (statusCode === 410 || statusCode === 404) {
          staleEndpoints.push(memberJson);
        }
      }
    }),
  );

  // Clean up stale subscriptions
  for (const stale of staleEndpoints) {
    try {
      await kvSrem(PUSH_KEY, stale);
    } catch {
      // Non-critical cleanup failure
    }
  }

  console.log(
    `[Push Send] ${sent} sent, ${failed} failed, ${staleEndpoints.length} removed` +
    ` (total ${results.length} subscribers)`,
  );

  return NextResponse.json({
    sent,
    failed,
    removed: staleEndpoints.length,
    total: members.length,
  });
}
