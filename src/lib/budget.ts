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

  console.log(
    `[Budget] Recorded: ${costCents.toFixed(4)}c | Day: ${newDay.toFixed(2)}c/${DAILY_BUDGET_CENTS}c | Month: ${newMonth.toFixed(2)}c/${MONTHLY_BUDGET_CENTS}c`,
  );
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
