import { NextRequest, NextResponse } from 'next/server';
import { kvSadd, kvSrem, kvScard } from '@/lib/kv';

const PUSH_KEY = 'mb:push:subscriptions';
const MAX_SUBSCRIPTIONS = 10000; // Safety cap

/**
 * POST /api/push — Save a push subscription
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();

    // Validate subscription shape
    if (!body.endpoint || typeof body.endpoint !== 'string') {
      return NextResponse.json({ error: 'Invalid subscription: missing endpoint' }, { status: 400 });
    }
    if (!body.keys?.p256dh || !body.keys?.auth) {
      return NextResponse.json({ error: 'Invalid subscription: missing keys' }, { status: 400 });
    }

    // Safety: limit total subscriptions
    const count = await kvScard(PUSH_KEY);
    if (count >= MAX_SUBSCRIPTIONS) {
      return NextResponse.json({ error: 'Subscription limit reached' }, { status: 429 });
    }

    // Store as JSON string in Redis SET (deduplicates by full JSON match)
    const subscriptionJson = JSON.stringify({
      endpoint: body.endpoint,
      keys: { p256dh: body.keys.p256dh, auth: body.keys.auth },
    });

    await kvSadd(PUSH_KEY, subscriptionJson);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[Push API] POST error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

/**
 * DELETE /api/push — Remove a push subscription
 */
export async function DELETE(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();

    if (!body.endpoint || typeof body.endpoint !== 'string') {
      return NextResponse.json({ error: 'Missing endpoint' }, { status: 400 });
    }

    // We need to find and remove the subscription matching this endpoint.
    // Since Redis SET stores full JSON, we need to reconstruct the stored format.
    // For simplicity, we import kvSmembers to find and remove the matching entry.
    const { kvSmembers } = await import('@/lib/kv');
    const members = await kvSmembers(PUSH_KEY);

    for (const member of members) {
      try {
        const sub = JSON.parse(member);
        if (sub.endpoint === body.endpoint) {
          await kvSrem(PUSH_KEY, member);
          break;
        }
      } catch {
        // Skip malformed entries
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[Push API] DELETE error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
