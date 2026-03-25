/**
 * API budget guard — prevents exceeding daily/total spend limits.
 *
 * Tracks estimated token costs per API call in Redis.
 * Falls back to in-memory if Redis is not configured.
 *
 * Budget: $5 total / 30 days = ~$0.17/day
 * Claude Sonnet pricing (approx):
 *   Input: $3/M tokens, Output: $15/M tokens
 *   With web_search: additional ~$10/1000 searches
 *
 * Conservative estimate per briefing generation:
 *   ~2000 input + ~1000 output + 1 search = ~$0.03 per call
 *   3 categories/day = ~$0.09/day (within budget)
 */

import { kvGet, kvSet, kvIncr, kvExpire } from './kv';

const DAILY_BUDGET_CENTS = 20; // $0.20 per day (with some buffer)
const ESTIMATED_COST_PER_CALL_CENTS = 3; // ~$0.03 per briefing generation

function kstToday(): string {
  return new Date(Date.now() + 9 * 3600 * 1000).toISOString().split('T')[0];
}

/**
 * Check if we can afford another API call today.
 */
export async function canAffordCall(): Promise<{
  allowed: boolean;
  spent: number;
  budget: number;
  callsToday: number;
}> {
  const key = `mb:budget:${kstToday()}`;
  const raw = await kvGet(key);
  const callsToday = raw ? parseInt(raw, 10) : 0;
  const spent = callsToday * ESTIMATED_COST_PER_CALL_CENTS;

  return {
    allowed: spent + ESTIMATED_COST_PER_CALL_CENTS <= DAILY_BUDGET_CENTS,
    spent,
    budget: DAILY_BUDGET_CENTS,
    callsToday,
  };
}

/**
 * Record an API call (should be called after successful generation).
 */
export async function recordCall(): Promise<void> {
  const key = `mb:budget:${kstToday()}`;
  await kvIncr(key);
  await kvExpire(key, 86400 * 2); // 2-day TTL
}

/**
 * Get budget status for admin dashboard.
 */
export async function getBudgetStatus(): Promise<{
  today: { calls: number; estimatedCostCents: number; budgetCents: number };
}> {
  const key = `mb:budget:${kstToday()}`;
  const raw = await kvGet(key);
  const calls = raw ? parseInt(raw, 10) : 0;

  return {
    today: {
      calls,
      estimatedCostCents: calls * ESTIMATED_COST_PER_CALL_CENTS,
      budgetCents: DAILY_BUDGET_CENTS,
    },
  };
}
