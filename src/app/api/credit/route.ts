import { NextRequest, NextResponse } from 'next/server';
import {
  getCreditRemainingCents,
  creditLevelFor,
  creditTopUp,
  creditSet,
} from '@/lib/budget';

/**
 * GET /api/credit — 크레딧 원장 조회/충전기록/시드 (owner-only, CRON_SECRET).
 *
 * Anthropic이 남은 잔액을 API로 안 줘서 "충전 누계 − 지출 누계"를 앱이 추정 추적한다.
 *   ?action=status (기본)  → 현재 추정 잔액 + 레벨
 *   ?action=topup&usd=5    → +$5 반영(충전했을 때), 저잔액 알림 재무장
 *   ?action=set&usd=3.24   → 잔액을 정확값으로 설정(시드/보정), 알림 재무장
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  if (request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const action = request.nextUrl.searchParams.get('action') || 'status';
  const usd = parseFloat(request.nextUrl.searchParams.get('usd') || '');

  if (action === 'topup' || action === 'set') {
    if (!Number.isFinite(usd) || usd < 0) {
      return NextResponse.json({ error: 'usd 파라미터 필요 (0 이상)' }, { status: 400 });
    }
    const cents = Math.round(usd * 100);
    const remainingCents = action === 'topup' ? await creditTopUp(cents) : await creditSet(cents);
    return NextResponse.json({
      ok: true,
      action,
      appliedUsd: usd,
      remainingUsd: +(remainingCents / 100).toFixed(2),
      level: creditLevelFor(remainingCents),
    });
  }

  // status (기본)
  const remainingCents = await getCreditRemainingCents();
  return NextResponse.json({
    ok: true,
    action: 'status',
    seeded: remainingCents !== null,
    remainingUsd: remainingCents === null ? null : +(remainingCents / 100).toFixed(2),
    level: remainingCents === null ? null : creditLevelFor(remainingCents),
  });
}
