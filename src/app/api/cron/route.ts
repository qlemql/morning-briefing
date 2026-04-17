import { NextRequest, NextResponse } from 'next/server';
import { generateBriefing } from '@/lib/claude';
import { ServerCache } from '@/lib/server-cache';
import { canAffordCall } from '@/lib/budget';
import { formatForAllPlatforms } from '@/lib/sns-formatter';
import { enqueueSNSPost, isQueueAvailable } from '@/lib/sns-queue';

export const maxDuration = 300;

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
  // 출시 전 비용 절감: economy만 실시간 생성, investment/lifestyle은 evergreen fallback 서빙
  const categories = ['economy'];
  const results: Record<string, string> = {};
  const startTime = Date.now();

  // Generate categories sequentially to control budget spend
  for (const category of categories) {
    // Pre-check budget before each generation
    const budget = await canAffordCall();
    if (!budget.allowed) {
      results[category] = `SKIP: budget exceeded (spent ${budget.spent}c / ${budget.budget}c, ${budget.callsToday} calls)`;
      console.warn(`[Cron] ${category} skipped — budget exceeded (${budget.spent}c / ${budget.budget}c)`);
      continue;
    }

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

      // Retry once on failure (but not if budget exceeded)
      if (message.includes('budget')) {
        results[category] = `SKIP: budget exceeded`;
        console.warn(`[Cron] ${category} skipped — budget exceeded`);
      } else {
        // Budget check before retry
        const retryBudget = await canAffordCall();
        if (!retryBudget.allowed) {
          results[category] = `SKIP (retry): budget exceeded (${retryBudget.spent}c / ${retryBudget.budget}c)`;
          console.warn(`[Cron] ${category} retry skipped — budget exceeded`);
          continue;
        }
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
    }
  }

  // SNS queue: format and enqueue posts for successful briefings
  const snsResults: Record<string, string> = {};
  if (isQueueAvailable()) {
    for (const category of categories) {
      if (!results[category]?.startsWith('OK')) continue;
      try {
        const briefing = ServerCache.get(category, today);
        if (!briefing || !briefing.cards[0]) continue;

        const formatted = formatForAllPlatforms(briefing);
        for (const [platform, content] of Object.entries(formatted)) {
          if (content) {
            await enqueueSNSPost(platform, content, category, today);
          }
        }
        snsResults[category] = 'queued';
      } catch (snsError) {
        // SNS queue failure should never affect briefing serving
        console.warn(`[Cron] SNS queue failed for ${category}:`, snsError);
        snsResults[category] = 'failed';
      }
    }
    if (Object.keys(snsResults).length > 0) {
      console.log('[Cron] SNS queue results:', snsResults);
    }
  }

  // Push notification: notify subscribers that new briefing is ready
  let pushResult: string | undefined;
  const hasSuccess = Object.values(results).some((r) => r.startsWith('OK'));
  if (hasSuccess) {
    try {
      const pushUrl = new URL('/api/push/send', request.url);
      const pushRes = await fetch(pushUrl.toString(), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.CRON_SECRET}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: '아침 브리핑',
          body: '오늘의 경제 브리핑이 도착했어요',
          url: '/',
        }),
      });
      const pushData = await pushRes.json();
      pushResult = `sent:${pushData.sent ?? 0} failed:${pushData.failed ?? 0}`;
      console.log('[Cron] Push notification result:', pushData);
    } catch (pushError) {
      // Push failure should never affect briefing serving
      pushResult = 'error';
      console.warn('[Cron] Push notification failed:', pushError);
    }
  }

  const elapsed = Date.now() - startTime;
  const failCount = Object.values(results).filter((r) => r.startsWith('FAIL')).length;
  console.log(
    `[Cron] Daily briefing for ${today} completed in ${(elapsed / 1000).toFixed(1)}s` +
    ` | ${categories.length - failCount}/${categories.length} succeeded`,
    results,
  );

  return NextResponse.json({
    date: today,
    results,
    snsQueue: Object.keys(snsResults).length > 0 ? snsResults : undefined,
    push: pushResult,
    elapsedMs: elapsed,
    timestamp: new Date().toISOString(),
  });
}
