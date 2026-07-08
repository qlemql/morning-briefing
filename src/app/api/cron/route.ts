import { NextRequest, NextResponse } from 'next/server';
import { generateBriefing } from '@/lib/claude';
import { ServerCache } from '@/lib/server-cache';
import { isRedisConfigured } from '@/lib/kv';
import { canAffordCall, evaluateCreditAlert } from '@/lib/budget';
import { formatForAllPlatforms } from '@/lib/sns-formatter';
import { enqueueSNSPost, isQueueAvailable } from '@/lib/sns-queue';
import { sendOwnerAlert } from '@/lib/alert';
import {
  creditExhaustedAlert,
  generationFailedAlert,
  generationCompletedAlert,
  creditLowAlert,
  watchdogRecoveredAlert,
} from '@/lib/alert-messages';
import { setCronStatus, type CronSource } from '@/lib/cron-status';

export const maxDuration = 300;

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
      // 생성됐어도 Redis 저장이 실패하면 다른 인스턴스(읽기 엔드포인트)는 폴백만
      // 서빙한다. 따라서 영구 저장 여부를 직접 확인하고, 안 됐으면 실패로 처리한다.
      if (isRedisConfigured() && !(await ServerCache.peekRedis(category, today))) {
        throw new Error('generated but not persisted to Redis');
      }
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
          // getOrGenerate로 재시도 — Redis 저장까지 보장한다.
          // (과거에는 generateBriefing + ServerCache.set으로 in-memory에만 저장돼
          //  재시도가 성공해도 읽기 엔드포인트는 폴백을 서빙하는 버그가 있었다.)
          // 첫 시도와 "의미 있게 다르게" 호출 — 동일 파라미터면 같은 실패를 결정론적으로 반복한다.
          // maxTokens↑(잘림 대응) + temperature 변경(형식이탈 패턴 깸) + 완결-JSON 보강 지시(opts.retry).
          // web_search는 유지(끄면 오늘자 뉴스/sourceUrl 날조).
          const briefing = await ServerCache.getOrGenerate(
            category,
            today,
            () => generateBriefing(category, today, { retry: true, maxTokens: 12000, temperature: 0.3 }),
          );
          if (isRedisConfigured() && !(await ServerCache.peekRedis(category, today))) {
            throw new Error('retry generated but not persisted to Redis');
          }
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
      // 크레딧 소진(Anthropic 계정 잔액 부족)은 예산 초과나 일시적 생성 실패와 성격이 완전히 다르다:
      // 결제 없이는 매일 전면 실패하므로, 일반 실패 알림에 묻히지 않게 별도의 명확한 알림을 보낸다.
      const failMsgs = categories.map((c) => results[c] ?? '');
      const creditExhausted = failMsgs.some((m) => /credit balance is too low/i.test(m));

      await sendOwnerAlert(
        creditExhausted
          ? creditExhaustedAlert({ date: today, source })
          : generationFailedAlert({ date: today, source, result: results.economy ?? 'N/A' }),
      );
    } else if (anyFresh) {
      // 이번 실행에서 "새로" 생성됐을 때만 알림 — 이미 있던 걸 재확인한 멱등 실행
      // (아침 트리거 후의 워치독/수동 재실행 등)은 조용히 넘겨 알림 피로를 막는다.
      const freshCat = categories.find(isFresh) ?? categories[0];
      const briefing = ServerCache.get(freshCat, today);
      const cardCount = briefing?.cards.length ?? 0;
      const firstTitle = briefing?.cards[0]?.title ?? '';
      await sendOwnerAlert(
        recovered
          ? watchdogRecoveredAlert({ date: today }) // 1차 누락을 워치독이 메꾼 특수 케이스
          : generationCompletedAlert({ date: today, source, cardCount, firstTitle }),
      );
    }
  } catch (alertError) {
    // 알림 실패는 cron 본 작업을 절대 깨뜨리면 안 됨
    console.warn('[Cron] owner alert failed:', alertError);
  }

  // 크레딧 저잔액 선제 경보 — 추정 잔액이 $3(경고)/$1(긴급) 이하로 "심각도 상승"할 때만 1회 발송.
  // (충전 시 원장이 레벨을 ok로 재무장 → 다시 떨어지면 재알림.) 시드 전이면 null → skip.
  try {
    const credit = await evaluateCreditAlert();
    if (credit?.shouldAlert && credit.level !== 'ok') {
      await sendOwnerAlert(
        creditLowAlert({ remainingCents: credit.remainingCents, level: credit.level }),
      );
    }
  } catch (creditError) {
    console.warn('[Cron] credit alert check failed:', creditError);
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
