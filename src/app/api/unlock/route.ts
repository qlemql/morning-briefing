import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { markUnlocked, isUnlocked } from '@/lib/user';
import { trackEvent } from '@/lib/analytics';

/**
 * Derive a device-based user ID from request headers.
 */
function getUserId(request: NextRequest): string {
  const ip =
    request.headers.get('x-forwarded-for') ||
    request.headers.get('x-real-ip') ||
    'unknown';
  const ua = request.headers.get('user-agent') || '';
  return createHash('sha256')
    .update(`${ip.split(',')[0].trim()}_${ua}`)
    .digest('hex')
    .substring(0, 16);
}

/**
 * POST /api/unlock — mark user as unlocked (after donation flow)
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const userId = getUserId(request);
    await markUnlocked(userId);
    await trackEvent('unlock');

    return NextResponse.json({
      meta: { version: '1.0', status: 'success' },
      data: { unlocked: true },
    });
  } catch {
    return NextResponse.json(
      {
        meta: { version: '1.0', status: 'error' },
        error: { code: 'UNLOCK_FAILED', message: 'Failed to unlock' },
      },
      { status: 500 },
    );
  }
}

/**
 * GET /api/unlock — check unlock status
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const userId = getUserId(request);
    const unlocked = await isUnlocked(userId);

    return NextResponse.json(
      {
        meta: { version: '1.0', status: 'success' },
        data: { unlocked },
      },
      {
        headers: {
          'Cache-Control': 'no-store',
        },
      },
    );
  } catch {
    return NextResponse.json({
      meta: { version: '1.0', status: 'success' },
      data: { unlocked: false },
    });
  }
}
