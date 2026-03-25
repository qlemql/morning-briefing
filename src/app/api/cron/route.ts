import { NextRequest, NextResponse } from 'next/server';
import { generateBriefing } from '@/lib/claude';
import { ServerCache } from '@/lib/server-cache';

/**
 * GET /api/cron
 * Vercel Cron Job — 매일 아침 자동으로 두 카테고리 브리핑 생성
 * vercel.json에서 schedule 설정
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  // Cron 시크릿 검증 (Vercel이 자동으로 전달)
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const today = new Date(Date.now() + 9 * 3600 * 1000).toISOString().split('T')[0];
  const categories = ['economy', 'investment', 'lifestyle'];
  const results: Record<string, string> = {};
  const startTime = Date.now();

  // Generate both categories in parallel for speed
  const promises = categories.map(async (category) => {
    try {
      const briefing = await ServerCache.getOrGenerate(
        category,
        today,
        () => generateBriefing(category, today),
      );
      results[category] = `OK (${briefing.cards.length} cards)`;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      results[category] = `FAIL: ${message}`;
      console.error(`[Cron] ${category} failed:`, error);

      // Retry once on failure
      try {
        console.log(`[Cron] Retrying ${category}...`);
        const briefing = await generateBriefing(category, today);
        ServerCache.set(category, today, briefing);
        results[category] = `OK (retry, ${briefing.cards.length} cards)`;
      } catch (retryError: unknown) {
        const retryMsg = retryError instanceof Error ? retryError.message : 'Unknown error';
        results[category] = `FAIL (retry failed): ${retryMsg}`;
        console.error(`[Cron] ${category} retry also failed:`, retryError);
      }
    }
  });

  await Promise.all(promises);

  const elapsed = Date.now() - startTime;
  console.log(`[Cron] Daily briefing for ${today} (${elapsed}ms):`, results);

  return NextResponse.json({
    date: today,
    results,
    timestamp: new Date().toISOString(),
  });
}
