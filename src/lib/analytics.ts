/**
 * Analytics module — persists to Upstash Redis via kv.ts.
 *
 * Key schema (prefix: "mb:"):
 *   mb:pv:{date}              → INCR  page views
 *   mb:uv:{date}              → SADD  unique visitor hashes
 *   mb:shares:{date}          → INCR
 *   mb:paywall:{date}         → INCR
 *   mb:unlocks:{date}         → INCR
 *   mb:cat:{date}             → HASH  { category: count }
 *
 * All keys get 30-day TTL for automatic cleanup.
 */

import {
  kvIncr,
  kvSadd,
  kvScard,
  kvHincrby,
  kvHgetall,
  kvExpire,
  kvGet,
} from './kv';

const TTL = 30 * 86400; // 30 days

function getToday(): string {
  return new Date(Date.now() + 9 * 3600 * 1000).toISOString().split('T')[0];
}

export async function trackPageView(visitorId: string, category?: string): Promise<void> {
  const date = getToday();
  const pvKey = `mb:pv:${date}`;
  const uvKey = `mb:uv:${date}`;

  await Promise.all([
    kvIncr(pvKey).then(() => kvExpire(pvKey, TTL)),
    kvSadd(uvKey, visitorId).then(() => kvExpire(uvKey, TTL)),
    category
      ? kvHincrby(`mb:cat:${date}`, category, 1).then(() =>
          kvExpire(`mb:cat:${date}`, TTL),
        )
      : Promise.resolve(),
  ]);
}

export async function trackEvent(
  event: 'share' | 'paywall_click' | 'unlock' | 'email_subscribed',
): Promise<void> {
  const date = getToday();
  const keyMap: Record<string, string> = {
    share: `mb:shares:${date}`,
    paywall_click: `mb:paywall:${date}`,
    unlock: `mb:unlocks:${date}`,
    email_subscribed: `mb:email_sub:${date}`,
  };
  const key = keyMap[event];
  if (!key) return;
  await kvIncr(key);
  await kvExpire(key, TTL);
}

export async function getStats(
  date?: string,
): Promise<Record<string, unknown>> {
  const d = date || getToday();

  const [pv, uv, shares, paywall, unlocks, catRaw] = await Promise.all([
    kvGet(`mb:pv:${d}`).then((v) => parseInt(v || '0', 10)),
    kvScard(`mb:uv:${d}`),
    kvGet(`mb:shares:${d}`).then((v) => parseInt(v || '0', 10)),
    kvGet(`mb:paywall:${d}`).then((v) => parseInt(v || '0', 10)),
    kvGet(`mb:unlocks:${d}`).then((v) => parseInt(v || '0', 10)),
    kvHgetall(`mb:cat:${d}`),
  ]);

  const categoryViews: Record<string, number> = {};
  for (const [k, v] of Object.entries(catRaw)) {
    categoryViews[k] = parseInt(v, 10);
  }

  return {
    date: d,
    pageViews: pv,
    uniqueVisitors: uv,
    shares,
    paywallClicks: paywall,
    unlocks,
    categoryViews,
    conversionRate:
      paywall > 0 ? ((unlocks / paywall) * 100).toFixed(1) + '%' : '0%',
  };
}

export async function getAllStats(): Promise<Record<string, unknown>[]> {
  // Last 7 days
  const days: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() + 9 * 3600 * 1000 - i * 86400 * 1000);
    days.push(d.toISOString().split('T')[0]);
  }
  return Promise.all(days.map((d) => getStats(d)));
}
