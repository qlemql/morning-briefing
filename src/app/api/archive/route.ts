import { NextRequest, NextResponse } from 'next/server';
import { ServerCache } from '@/lib/server-cache';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * GET /api/archive
 *  - ?category=economy&date=YYYY-MM-DD → 해당 날짜의 보관(365일) 브리핑 반환
 *  - ?category=economy (date 없음)     → 보관된 날짜 목록 반환
 *
 * 메인의 /api/briefing은 1일 캐시라 과거 날짜엔 evergreen을 주므로,
 * 지난 브리핑 조회는 이 엔드포인트(archive 365일)를 사용한다.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const category = request.nextUrl.searchParams.get('category') || 'economy';
  const date = request.nextUrl.searchParams.get('date');

  // 날짜 지정 → 해당 날짜 브리핑
  if (date) {
    if (!DATE_RE.test(date)) {
      return NextResponse.json(
        { meta: { version: '1.0', status: 'error' }, error: { code: 'INVALID_DATE', message: 'date must be YYYY-MM-DD' } },
        { status: 400 },
      );
    }
    const briefing = await ServerCache.getArchive(category, date);
    if (!briefing) {
      return NextResponse.json(
        { meta: { version: '1.0', status: 'error' }, error: { code: 'NOT_FOUND', message: 'no briefing for this date' } },
        { status: 404, headers: { 'Cache-Control': 's-maxage=300' } },
      );
    }
    return NextResponse.json(
      { meta: { version: '1.0', status: 'success' }, data: briefing },
      // 과거 콘텐츠는 불변 — 장기 캐시
      { headers: { 'Cache-Control': 's-maxage=86400, stale-while-revalidate=604800' } },
    );
  }

  // 날짜 미지정 → 보관 날짜 목록
  const dates = await ServerCache.listArchiveDates(category, 365);
  return NextResponse.json(
    { meta: { version: '1.0', status: 'success' }, data: { category, dates } },
    { headers: { 'Cache-Control': 's-maxage=600, stale-while-revalidate=3600' } },
  );
}
