import { NextResponse } from 'next/server';
import { isRedisConfigured, kvGet, kvSet } from '@/lib/kv';
import { getBudgetStatus } from '@/lib/budget';
import { ServerCache } from '@/lib/server-cache';

/**
 * GET /api/health — system health check
 * Public endpoint (no auth required) for uptime monitoring.
 */
export async function GET(): Promise<NextResponse> {
  const checks: Record<string, { ok: boolean; detail?: string }> = {};
  const startTime = Date.now();

  // 1. Anthropic API key configured
  checks.anthropic = {
    ok: !!process.env.ANTHROPIC_API_KEY,
    detail: process.env.ANTHROPIC_API_KEY ? 'configured' : 'missing',
  };

  // 2. CRON_SECRET configured
  checks.cron_secret = {
    ok: !!process.env.CRON_SECRET,
    detail: process.env.CRON_SECRET ? 'configured' : 'missing',
  };

  // 3. Redis connectivity
  if (isRedisConfigured()) {
    try {
      const testKey = 'mb:health:ping';
      await kvSet(testKey, 'pong', 60);
      const val = await kvGet(testKey);
      checks.redis = {
        ok: val === 'pong',
        detail: val === 'pong' ? 'connected' : 'read mismatch',
      };
    } catch (err) {
      checks.redis = {
        ok: false,
        detail: err instanceof Error ? err.message : 'unknown error',
      };
    }
  } else {
    checks.redis = {
      ok: true,
      detail: 'not configured (using in-memory fallback)',
    };
  }

  // 4. Server cache stats
  const cacheStats = ServerCache.getStats();
  checks.cache = {
    ok: true,
    detail: `${cacheStats.size} entries`,
  };

  // 5. Budget status
  try {
    const budget = await getBudgetStatus();
    const remainingDay = budget.today.budgetCents - budget.today.spentCents;
    const remainingMonth = budget.month.budgetCents - budget.month.spentCents;
    checks.budget = {
      ok: remainingDay > 0 && remainingMonth > 0,
      detail: `Day: $${(budget.today.spentCents / 100).toFixed(2)}/$${(budget.today.budgetCents / 100).toFixed(2)} | Month: $${(budget.month.spentCents / 100).toFixed(2)}/$${(budget.month.budgetCents / 100).toFixed(2)}`,
    };
  } catch {
    checks.budget = { ok: false, detail: 'failed to check' };
  }

  const allOk = Object.values(checks).every((c) => c.ok);
  const elapsed = Date.now() - startTime;

  return NextResponse.json(
    {
      status: allOk ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      responseMs: elapsed,
      checks,
    },
    {
      status: allOk ? 200 : 503,
      headers: { 'Cache-Control': 'no-store' },
    },
  );
}
