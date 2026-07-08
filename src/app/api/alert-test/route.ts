import { NextRequest, NextResponse } from 'next/server';
import { sendOwnerAlert } from '@/lib/alert';
import {
  creditExhaustedAlert,
  generationFailedAlert,
  generationCompletedAlert,
  creditLowAlert,
  watchdogRecoveredAlert,
} from '@/lib/alert-messages';

/**
 * GET /api/alert-test — 운영자 알림 3종을 텔레그램으로 미리 발송(드릴).
 *
 * owner-only (CRON_SECRET). 실제 장애가 아님을 알 수 있게 각 메시지 앞에 [테스트] 배너를 붙인다.
 * 실제 알림과 동일한 빌더(@/lib/alert-messages)를 쓰므로 미리보기와 실제 문구가 갈리지 않는다.
 *
 * ?which=all(기본) | credit | fail | recovery | complete | lowcredit
 */

const TEST_BANNER = '🧪 <b>[테스트 알림]</b> 실제 상황 아님 — 알림 파이프라인 점검용\n\n';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID)) {
    return NextResponse.json(
      { ok: false, error: 'Telegram 미설정 (TELEGRAM_BOT_TOKEN/CHAT_ID) — /api/health로 확인' },
      { status: 400 },
    );
  }

  const today = new Date(Date.now() + 9 * 3600 * 1000).toISOString().split('T')[0];

  const catalog: Record<string, string> = {
    credit: creditExhaustedAlert({ date: today, source: 'alert-test' }),
    fail: generationFailedAlert({
      date: today,
      source: 'alert-test',
      result: '(테스트) No JSON found in Claude response',
    }),
    recovery: watchdogRecoveredAlert({ date: today }),
    complete: generationCompletedAlert({
      date: today,
      source: 'alert-test',
      cardCount: 3,
      firstTitle: '(테스트) SK하이닉스, 45조 들고 나스닥 간다',
    }),
    lowcredit: creditLowAlert({ remainingCents: 280, level: 'warn' }),
  };

  const which = request.nextUrl.searchParams.get('which') || 'all';
  const keys = which === 'all' ? Object.keys(catalog) : [which];

  const results: Record<string, string> = {};
  for (const k of keys) {
    if (!(k in catalog)) {
      results[k] = 'unknown (credit|fail|recovery|all)';
      continue;
    }
    const sent = await sendOwnerAlert(TEST_BANNER + catalog[k]);
    results[k] = sent ? 'sent' : 'send failed';
  }

  const allSent = Object.values(results).every((r) => r === 'sent');
  return NextResponse.json(
    { ok: allSent, which, results, timestamp: new Date().toISOString() },
    { status: allSent ? 200 : 502 },
  );
}
