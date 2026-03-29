import { NextRequest, NextResponse } from 'next/server';
import { kvGet, kvIncr, kvSet, kvSadd, kvScard } from '@/lib/kv';

const MAX_BONUS = 7;

/**
 * POST /api/referral — Register a referral (someone used a ref code)
 * Body: { code: string, action: 'register' }
 *
 * Redis keys:
 *   mb:ref:{code}:visitors — SET of visitor fingerprints (dedup)
 *   mb:ref:{code}:count   — total confirmed referrals
 *   mb:ref:{code}:bonus   — bonus days granted (capped at 7)
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { code, action } = body as { code?: string; action?: string };

    if (!code || action !== 'register') {
      return NextResponse.json(
        { error: 'Invalid request' },
        { status: 400 },
      );
    }

    // Validate code format: 6 alphanumeric chars
    if (!/^[A-Z0-9]{6}$/.test(code)) {
      return NextResponse.json(
        { error: 'Invalid referral code' },
        { status: 400 },
      );
    }

    // Derive visitor fingerprint for dedup
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      'unknown';
    const ua = request.headers.get('user-agent') || '';
    // Simple hash without crypto (client-side dedup also exists)
    const fingerprint = `${ip}_${ua.substring(0, 50)}`;

    // Check if this visitor already registered for this code
    const added = await kvSadd(`mb:ref:${code}:visitors`, fingerprint);
    if (added === 0) {
      // Already registered — no double counting
      return NextResponse.json({ ok: true, duplicate: true });
    }

    // Increment count
    const count = await kvIncr(`mb:ref:${code}:count`);

    // Calculate bonus (capped at MAX_BONUS)
    const bonus = Math.min(count, MAX_BONUS);
    await kvSet(`mb:ref:${code}:bonus`, String(bonus));

    return NextResponse.json({
      ok: true,
      invited: count,
      bonusDays: bonus,
    });
  } catch (err) {
    console.error('Referral POST error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

/**
 * GET /api/referral?code=ABC123 — Get referral stats for a code
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const code = request.nextUrl.searchParams.get('code');

    if (!code || !/^[A-Z0-9]{6}$/.test(code)) {
      return NextResponse.json(
        { error: 'Invalid referral code' },
        { status: 400 },
      );
    }

    const countStr = await kvGet(`mb:ref:${code}:count`);
    const bonusStr = await kvGet(`mb:ref:${code}:bonus`);
    const visitors = await kvScard(`mb:ref:${code}:visitors`);

    const invited = countStr ? parseInt(countStr, 10) : 0;
    const bonusDays = bonusStr ? parseInt(bonusStr, 10) : 0;

    return NextResponse.json(
      {
        code,
        invited,
        bonusDays,
        visitors,
      },
      {
        headers: { 'Cache-Control': 'no-store' },
      },
    );
  } catch (err) {
    console.error('Referral GET error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
