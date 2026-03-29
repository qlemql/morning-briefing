import { NextRequest, NextResponse } from 'next/server';
import { getAllPendingCounts, dequeueSNSPost, isQueueAvailable } from '@/lib/sns-queue';

/**
 * GET /api/sns-queue?secret=...
 * Returns pending SNS post counts per platform.
 *
 * POST /api/sns-queue?secret=...&platform=twitter
 * Dequeue one post from the specified platform (for future SNS API integration).
 */

function isAuthorized(request: NextRequest): boolean {
  const secret = request.nextUrl.searchParams.get('secret');
  return secret === process.env.CRON_SECRET;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!isQueueAvailable()) {
    return NextResponse.json({
      available: false,
      counts: { twitter: 0, threads: 0, instagram: 0 },
    });
  }

  const counts = await getAllPendingCounts();
  return NextResponse.json({ available: true, counts });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const platform = request.nextUrl.searchParams.get('platform');
  if (!platform || !['twitter', 'threads', 'instagram'].includes(platform)) {
    return NextResponse.json(
      { error: 'Invalid platform. Use: twitter, threads, instagram' },
      { status: 400 },
    );
  }

  const post = await dequeueSNSPost(platform);
  if (!post) {
    return NextResponse.json({ post: null, message: 'Queue is empty' });
  }

  return NextResponse.json({ post });
}
