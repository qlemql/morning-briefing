import { NextResponse } from 'next/server';
import { isRedisConfigured, kvGet, kvSet } from '@/lib/kv';
import { getBudgetStatus, getCreditRemainingCents, creditLevelFor } from '@/lib/budget';
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

  // 2b. Telegram owner-alert 채널 설정 여부 (운영자 알림용).
  // 미설정이어도 서비스 자체는 정상이므로 ok:true로 두고 detail로만 상태를 노출한다
  // (uptime 모니터가 알림 미설정 때문에 degraded로 뜨지 않게).
  const telegramConfigured = !!(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID);
  checks.telegram = {
    ok: true,
    detail: telegramConfigured ? 'configured' : 'MISSING — owner alerts disabled',
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

  // 6. Credit ledger (추정 잔액). 저잔액이어도 사이트는 폴백으로 서빙되므로 uptime은 안 깨지게
  // ok:true로 두고 detail로만 노출(경보는 cron의 텔레그램 저잔액 알림이 담당).
  try {
    const remainingCents = await getCreditRemainingCents();
    checks.credit = {
      ok: true,
      detail: remainingCents === null
        ? 'not seeded'
        : `~$${(remainingCents / 100).toFixed(2)} (${creditLevelFor(remainingCents)})`,
    };
  } catch {
    checks.credit = { ok: true, detail: 'unavailable' };
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
