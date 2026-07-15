import { NextRequest, NextResponse } from 'next/server';
import { kvGet, kvSet } from '@/lib/kv';
import { ServerCache } from '@/lib/server-cache';
import { generateInteractiveLesson, type InteractiveLesson } from '@/lib/lesson';

export const maxDuration = 300;

const LESSON_TTL = 86400 * 400; // 400일 (아카이브와 함께 장기 보관)
const lessonKey = (date: string) => `mb:lesson:economy:${date}`;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function todayKST(): string {
  return new Date(Date.now() + 9 * 3600 * 1000).toISOString().split('T')[0];
}

async function readLesson(date: string): Promise<InteractiveLesson | null> {
  const raw = await kvGet(lessonKey(date));
  if (!raw) return null;
  try { return JSON.parse(raw) as InteractiveLesson; } catch { return null; }
}

/** 해당 날짜 아카이브 브리핑으로 레슨 생성 후 캐시. 실패 시 null. */
async function generateAndCache(date: string): Promise<InteractiveLesson | null> {
  const briefing = await ServerCache.getArchive('economy', date);
  if (!briefing || !briefing.cards?.length) return null;
  const lesson = await generateInteractiveLesson(briefing, date);
  if (lesson) await kvSet(lessonKey(date), JSON.stringify(lesson), LESSON_TTL);
  return lesson;
}

/**
 * GET /api/lesson
 *  - ?date=YYYY-MM-DD            → 캐시된 레슨 반환(공개, 생성 안 함). 없으면 lesson:null.
 *  - ?date=..&generate=1         → 해당 날짜 아카이브로 생성+캐시 (owner, CRON_SECRET).
 *  - ?backfill=N                 → 최근 N개 아카이브 날짜 중 레슨 없는 곳을 생성 (owner, 과거 테스트용).
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const sp = request.nextUrl.searchParams;
  const isOwner = request.headers.get('authorization') === `Bearer ${process.env.CRON_SECRET}`;

  // 백필: 과거 아카이브 날짜들에 레슨 생성 (owner 전용)
  const backfillN = parseInt(sp.get('backfill') || '', 10);
  if (Number.isFinite(backfillN) && backfillN > 0) {
    if (!isOwner) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const n = Math.min(backfillN, 14);
    const dates = (await ServerCache.listArchiveDates('economy', 365)).sort().reverse().slice(0, n);
    const results: Record<string, string> = {};
    for (const d of dates) {
      if (await readLesson(d)) { results[d] = 'exists'; continue; }
      const lesson = await generateAndCache(d);
      results[d] = lesson ? `ok: ${lesson.title}` : 'fail';
    }
    return NextResponse.json({ ok: true, backfilled: results });
  }

  const date = sp.get('date') || todayKST();
  if (!DATE_RE.test(date)) {
    return NextResponse.json({ error: 'date must be YYYY-MM-DD' }, { status: 400 });
  }

  // 생성(단일 날짜, owner 전용) — 비용 발생하므로 인증 필요
  if (sp.get('generate') === '1') {
    if (!isOwner) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const existing = await readLesson(date);
    if (existing) return NextResponse.json({ ok: true, cached: true, lesson: existing });
    const lesson = await generateAndCache(date);
    return NextResponse.json(
      { ok: !!lesson, lesson: lesson ?? null },
      { status: lesson ? 200 : 502 },
    );
  }

  // 읽기(공개) — 캐시만, 생성 안 함
  const lesson = await readLesson(date);
  return NextResponse.json(
    { ok: true, lesson: lesson ?? null },
    { headers: { 'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=86400' } },
  );
}
