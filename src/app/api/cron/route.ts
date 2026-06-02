import { NextRequest, NextResponse } from 'next/server';
import { generateBriefing } from '@/lib/claude';
import { ServerCache } from '@/lib/server-cache';
import { canAffordCall } from '@/lib/budget';
import { formatForAllPlatforms } from '@/lib/sns-formatter';
import { enqueueSNSPost, isQueueAvailable } from '@/lib/sns-queue';
import { sendOwnerAlert } from '@/lib/alert';
import { setCronStatus, type CronSource } from '@/lib/cron-status';

export const maxDuration = 300;

function adminUrl(): string {
  const base = process.env.NEXT_PUBLIC_SITE_URL || 'https://morning-briefing-mocha.vercel.app';
  return `${base}/admin`;
}

/**
 * GET /api/cron
 * Vercel Cron Job — 매일 아침 자동으로 economy 브리핑 생성.
 * vercel.json에서 schedule 설정 (07:00 KST 1차 + 10:00 KST 워치독).
 *
 * 멱등(idempotent): 오늘자 브리핑이 이미 있으면 재생성/재호출하지 않으므로
 * 워치독·수동 재실행 시에도 중복 비용/중복 push가 발생하지 않는다.
 *
 * ?source=manual | watchdog — 트리거 출처 라벨 (없으면 'cron')
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  // Cron 시크릿 검증 (Vercel이 자동으로 전달)
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const sourceParam = request.nextUrl.searchParams.get('source');
  const source: CronSource =
    sourceParam === 'manual' || sourceParam === 'watchdog' ? sourceParam : 'cron';

  const today = new Date(Date.now() + 9 * 3600 * 1000).toISOString().split('T')[0];
  // 출시 전 비용 절감: economy만 실시간 생성, investment/lifestyle은 evergreen fallback 서빙
  const categories = ['economy'];
  const results: Record<string, string> = {};
  const startTime = Date.now();

  // 이번 실행 "전에" 이미 브리핑이 있었는지 스냅샷.
  // "방금 새로 생성했다" vs "이미 있던 것"을 구분 → 중복 push/SNS 방지, 워치독 멱등성 확보.
  const existedBefore: Record<string, boolean> = {};
  for (const category of categories) {
    existedBefore[category] = await ServerCache.peekRedis(category, today);
  }

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

  // "이번 실행에서 새로 생성됐는가" — 이미 있던 건 false (중복 작업 방지)
  const isFresh = (category: string): boolean =>
    !!results[category]?.startsWith('OK') && !existedBefore[category];
  const anyFresh = categories.some(isFresh);
  const allOk = categories.every((c) => results[c]?.startsWith('OK'));

  // SNS queue: 새로 생성된 브리핑만 큐잉 (재실행 시 중복 포스팅 방지)
  const snsResults: Record<string, string> = {};
  if (isQueueAvailable()) {
    for (const category of categories) {
      if (!isFresh(category)) continue;
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

  // Push notification: 이번 실행에서 새로 생성된 경우에만 발송 (재실행 중복 push 방지)
  let pushResult: string | undefined;
  if (anyFresh) {
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

  // 워치독이 1차 누락을 메꿔 새로 생성한 경우
  const recovered = source === 'watchdog' && anyFresh;

  // 실행 상태 기록 (어드민 대시보드 노출용)
  await setCronStatus({
    date: today,
    ok: allOk,
    results,
    source,
    ranAt: new Date().toISOString(),
    recovered,
  });

  // 운영자 알림 (Telegram) — 실패 시 / 워치독 복구 시
  try {
    if (!allOk) {
      await sendOwnerAlert(
        `🚨 <b>아침브리핑 생성 실패</b>\n날짜: ${today}\n트리거: ${source}\n결과: ${results.economy ?? 'N/A'}\n\n어드민에서 재생성하세요:\n${adminUrl()}`,
      );
    } else if (recovered) {
      await sendOwnerAlert(
        `✅ <b>아침브리핑 자동 복구</b>\n날짜: ${today}\n1차 생성이 빠졌지만 워치독이 재생성했어요.`,
      );
    }
  } catch (alertError) {
    // 알림 실패는 cron 본 작업을 절대 깨뜨리면 안 됨
    console.warn('[Cron] owner alert failed:', alertError);
  }

  const elapsed = Date.now() - startTime;
  const failCount = Object.values(results).filter((r) => r.startsWith('FAIL')).length;
  console.log(
    `[Cron] Daily briefing for ${today} (${source}) completed in ${(elapsed / 1000).toFixed(1)}s` +
    ` | ${categories.length - failCount}/${categories.length} ok | fresh:${anyFresh}`,
    results,
  );

  return NextResponse.json({
    date: today,
    source,
    ok: allOk,
    freshlyGenerated: anyFresh,
    recovered,
    results,
    snsQueue: Object.keys(snsResults).length > 0 ? snsResults : undefined,
    push: pushResult,
    elapsedMs: elapsed,
    timestamp: new Date().toISOString(),
  });
}
