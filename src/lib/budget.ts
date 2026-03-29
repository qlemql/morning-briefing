/**
 * API budget guard — prevents exceeding daily/monthly spend limits.
 *
 * Tracks ACTUAL token usage costs per API call in Redis.
 * Falls back to in-memory if Redis is not configured.
 *
 * Budget: $5/month hard limit, ~$0.17/day soft limit
 * Claude Sonnet pricing:
 *   Input: $3/M tokens, Output: $15/M tokens
 *
 * Cost formula (cents):
 *   (input_tokens * 3 + output_tokens * 15) / 1_000_000 * 100
 */

import { kvGet, kvSet, kvExpire } from './kv';

const DAILY_BUDGET_CENTS = 17; // $5 / 30 days ≈ $0.17/day
const MONTHLY_BUDGET_CENTS = 500; // $5.00 hard limit

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

/**
 * Calculate cost in cents from token usage.
 */
function calcCostCents(input_tokens: number, output_tokens: number): number {
  return (input_tokens * 3 + output_tokens * 15) / 1_000_000 * 100;
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
export async function recordCall(usage: {
  input_tokens: number;
  output_tokens: number;
}): Promise<void> {
  const costCents = calcCostCents(usage.input_tokens, usage.output_tokens);

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
