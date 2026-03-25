import { NextRequest, NextResponse } from 'next/server';

/**
 * In-memory email list (MVP).
 * Production: migrate to Vercel KV, Supabase, or newsletter service.
 */
const subscribers = new Set<string>();

/**
 * POST /api/subscribe — collect email for newsletter
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Invalid email' }, { status: 400 });
    }

    const normalized = email.trim().toLowerCase();
    subscribers.add(normalized);
    console.log(`[Subscribe] New subscriber: ${normalized} (total: ${subscribers.size})`);

    return NextResponse.json({ ok: true, count: subscribers.size }, { status: 200 });
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

  return NextResponse.json({
    count: subscribers.size,
    emails: Array.from(subscribers),
  });
}
