/**
 * API budget guard — prevents exceeding daily/monthly spend limits.
 *
 * Tracks ACTUAL token usage costs per API call in Redis.
 * Falls back to in-memory if Redis is not configured.
 *
 * Budget: $12/month hard limit, $1/day guard (2026-07-06 현실화).
 * Claude Sonnet 4.x pricing ($/M tokens):
 *   input(비캐시) $3 · output $15 · cache_write(5m) $3.75(1.25x) · cache_read $0.30(0.1x)
 *   web_search: $10 / 1,000 requests = $0.01/건
 *
 * ⚠️ 과거 버그: recordCall이 output+비캐시input만 세어 실제의 ~22%만 추적 →
 *    캐시쓰기($8.86/mo)·web_search가 통째로 누락돼 $5 한도가 무의미했고, 실제 ~$16/mo를
 *    쓰다 크레딧 소진(2026-07-03). 이제 캐시·web_search까지 전부 반영해 한도가 실제로 작동한다.
 */

import { kvGet, kvSet, kvExpire } from './kv';

const DAILY_BUDGET_CENTS = 100; // $1.00/day — 런어웨이 방지용 상한(정상일 ~$0.35)
const MONTHLY_BUDGET_CENTS = 1200; // $12.00 hard limit (전략 ③ 중간). 불안하면 auto-reload로 ②

function kstToday(): string {
  return new Date(Date.now() + 9 * 3600 * 1000).toISOString().split('T')[0];
}

function kstMonth(): string {
  return kstToday().substring(0, 7); // YYYY-MM
}

function dayKey(): string {
  return `mb:budget:day:${kstToday()}`;
}

function monthKey(): string {
  return `mb:budget:month:${kstMonth()}`;
}

/** 실제 청구를 반영한 usage(캐시 쓰기/읽기 + web_search 포함). */
export interface CallUsage {
  input_tokens: number;
  output_tokens: number;
  cache_creation_tokens?: number; // 캐시 쓰기 (5m ephemeral, 1.25x)
  cache_read_tokens?: number; // 캐시 읽기 (0.1x)
  web_search_requests?: number; // 서버 web_search 호출 수
}

/**
 * Calculate cost in cents — 토큰 4종 + web_search를 모두 반영.
 * (과거엔 input/output만 세어 실제의 ~22%만 추적했음. 상단 주석 참고.)
 */
function calcCostCents(u: CallUsage): number {
  const tokenCents =
    (u.input_tokens * 3 +
      u.output_tokens * 15 +
      (u.cache_creation_tokens ?? 0) * 3.75 +
      (u.cache_read_tokens ?? 0) * 0.3) /
    1_000_000 *
    100;
  const webSearchCents = (u.web_search_requests ?? 0) * 1; // $0.01 = 1c/건
  return tokenCents + webSearchCents;
}

/**
 * Check if we can afford another API call today (daily AND monthly).
 */
export async function canAffordCall(): Promise<{
  allowed: boolean;
  spentToday: number;
  spentMonth: number;
  dailyBudget: number;
  monthlyBudget: number;
  // Legacy compat fields
  spent: number;
  budget: number;
  callsToday: number;
}> {
  const [rawDay, rawMonth] = await Promise.all([
    kvGet(dayKey()),
    kvGet(monthKey()),
  ]);
  const spentToday = rawDay ? parseFloat(rawDay) : 0;
  const spentMonth = rawMonth ? parseFloat(rawMonth) : 0;

  const dailyOk = spentToday < DAILY_BUDGET_CENTS;
  const monthlyOk = spentMonth < MONTHLY_BUDGET_CENTS;

  return {
    allowed: dailyOk && monthlyOk,
    spentToday,
    spentMonth,
    dailyBudget: DAILY_BUDGET_CENTS,
    monthlyBudget: MONTHLY_BUDGET_CENTS,
    // Legacy compat
    spent: spentToday,
    budget: DAILY_BUDGET_CENTS,
    callsToday: 0, // no longer tracked by count
  };
}

/**
 * Record an API call with actual token usage (called after successful generation).
 */
export async function recordCall(usage: CallUsage): Promise<void> {
  // 회계 실패가 생성 흐름을 깨면 안 됨 → 내부에서 삼키고 로그만 남긴다(fail-safe).
  try {
    const costCents = calcCostCents(usage);

    const dKey = dayKey();
    const mKey = monthKey();

    // Read current values, add cost, write back
    const [rawDay, rawMonth] = await Promise.all([
      kvGet(dKey),
      kvGet(mKey),
    ]);

    const newDay = (rawDay ? parseFloat(rawDay) : 0) + costCents;
    const newMonth = (rawMonth ? parseFloat(rawMonth) : 0) + costCents;

    await Promise.all([
      kvSet(dKey, newDay.toFixed(4), 86400 * 2), // 2-day TTL
      kvSet(mKey, newMonth.toFixed(4), 86400 * 35), // 35-day TTL
    ]);

    // 크레딧 원장 차감 (성공·실패 공통 — 이 호출은 API가 응답한 뒤라 토큰은 이미 청구됨)
    await chargeCredit(costCents);

    console.log(
      `[Budget] Recorded: ${costCents.toFixed(4)}c | Day: ${newDay.toFixed(2)}c/${DAILY_BUDGET_CENTS}c | Month: ${newMonth.toFixed(2)}c/${MONTHLY_BUDGET_CENTS}c`,
    );
  } catch (e) {
    console.warn('[Budget] recordCall failed (non-fatal):', e);
  }
}

/**
 * Get budget status for admin dashboard / health check.
 */
export async function getBudgetStatus(): Promise<{
  today: { spentCents: number; budgetCents: number };
  month: { spentCents: number; budgetCents: number };
}> {
  const [rawDay, rawMonth] = await Promise.all([
    kvGet(dayKey()),
    kvGet(monthKey()),
  ]);

  return {
    today: {
      spentCents: rawDay ? parseFloat(rawDay) : 0,
      budgetCents: DAILY_BUDGET_CENTS,
    },
    month: {
      spentCents: rawMonth ? parseFloat(rawMonth) : 0,
      budgetCents: MONTHLY_BUDGET_CENTS,
    },
  };
}

// ─── Credit ledger (선불 잔액 추정 추적) ──────────────────────────────────────
// Anthropic이 남은 잔액을 API로 안 줘서, "충전 누계 − 지출 누계"를 앱이 추정 추적한다.
// 성공+실패 생성 모두 차감(recordCall이 API 응답 직후 호출됨). 공유 계정(f1-instagram 등)의
// 지출은 안 보이므로 실제보다 살짝 높게 추정될 수 있어 임계값에 여유를 둔다.
const CREDIT_KEY = 'mb:credit:remaining_cents';
const CREDIT_ALERT_KEY = 'mb:credit:alert_level'; // 'ok' | 'warn' | 'urgent'
const CREDIT_WARN_CENTS = 300; // $3.00 이하 경고
const CREDIT_URGENT_CENTS = 100; // $1.00 이하 긴급

export type CreditLevel = 'ok' | 'warn' | 'urgent';
const LEVEL_RANK: Record<CreditLevel, number> = { ok: 0, warn: 1, urgent: 2 };

export function creditLevelFor(cents: number): CreditLevel {
  if (cents <= CREDIT_URGENT_CENTS) return 'urgent';
  if (cents <= CREDIT_WARN_CENTS) return 'warn';
  return 'ok';
}

/** 추정 잔액(cents). 시드 전이면 null. */
export async function getCreditRemainingCents(): Promise<number | null> {
  const raw = await kvGet(CREDIT_KEY);
  return raw === null ? null : parseFloat(raw);
}

async function setCreditRemainingCents(cents: number): Promise<void> {
  await kvSet(CREDIT_KEY, cents.toFixed(2)); // TTL 없음 = 영구
}

/** 생성 비용만큼 잔액 차감. 시드 전(null)이면 no-op. */
async function chargeCredit(costCents: number): Promise<void> {
  const cur = await getCreditRemainingCents();
  if (cur === null) return;
  await setCreditRemainingCents(cur - costCents);
}

/** 충전 반영(+). 알림 레벨 재무장(ok). 새 잔액 반환. */
export async function creditTopUp(addCents: number): Promise<number> {
  const next = ((await getCreditRemainingCents()) ?? 0) + addCents;
  await setCreditRemainingCents(next);
  await kvSet(CREDIT_ALERT_KEY, 'ok');
  return next;
}

/** 잔액을 정확값으로 설정(시드/보정). 알림 레벨 재무장(ok). */
export async function creditSet(cents: number): Promise<number> {
  await setCreditRemainingCents(cents);
  await kvSet(CREDIT_ALERT_KEY, 'ok');
  return cents;
}

/**
 * 현재 잔액 기준 저잔액 알림이 필요한지 판정.
 * "심각도 상승(ok→warn→urgent)" 시에만 shouldAlert=true → 중복/다운그레이드 스팸 방지.
 * (충전하면 creditTopUp/creditSet가 레벨을 ok로 재무장.) 시드 전이면 null.
 */
export async function evaluateCreditAlert(): Promise<
  { shouldAlert: boolean; level: CreditLevel; remainingCents: number } | null
> {
  const remaining = await getCreditRemainingCents();
  if (remaining === null) return null;
  const level = creditLevelFor(remaining);
  const last = ((await kvGet(CREDIT_ALERT_KEY)) as CreditLevel | null) ?? 'ok';
  const shouldAlert = LEVEL_RANK[level] > LEVEL_RANK[last];
  if (shouldAlert) await kvSet(CREDIT_ALERT_KEY, level);
  return { shouldAlert, level, remainingCents: remaining };
}
