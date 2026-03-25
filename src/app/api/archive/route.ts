import { NextRequest, NextResponse } from 'next/server';
import { ServerCache } from '@/lib/server-cache';

/**
 * GET /api/archive — list available briefing dates
 * Returns dates that have cached briefings.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const category = request.nextUrl.searchParams.get('category') || 'economy';
  const stats = ServerCache.getStats();

  return NextResponse.json({
    meta: { version: '1.0', status: 'success' },
    data: {
      category,
      cache: stats,
      // For MVP: only today's briefing is available (no persistent storage yet)
      message: 'Archive requires database integration. Coming in v2.',
    },
  });
}
