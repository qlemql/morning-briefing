/**
 * Lightweight server-side analytics (in-memory for MVP).
 * Tracks: page views, unique visitors (daily), shares, paywall clicks, unlocks.
 * Data resets on cold start — sufficient for early-stage KPI monitoring.
 *
 * For production: replace with Vercel Analytics or a simple DB.
 */

interface DailyStats {
  date: string;
  pageViews: number;
  uniqueVisitors: Set<string>;
  shares: number;
  paywallClicks: number;
  unlocks: number;
  categoryViews: Record<string, number>;
}

const stats = new Map<string, DailyStats>();

function getToday(): string {
  return new Date(Date.now() + 9 * 3600 * 1000).toISOString().split('T')[0];
}

function getOrCreateDay(date: string): DailyStats {
  if (!stats.has(date)) {
    stats.set(date, {
      date,
      pageViews: 0,
      uniqueVisitors: new Set(),
      shares: 0,
      paywallClicks: 0,
      unlocks: 0,
      categoryViews: {},
    });
  }
  return stats.get(date)!;
}

export function trackPageView(visitorId: string, category?: string): void {
  const day = getOrCreateDay(getToday());
  day.pageViews++;
  day.uniqueVisitors.add(visitorId);
  if (category) {
    day.categoryViews[category] = (day.categoryViews[category] || 0) + 1;
  }
}

export function trackEvent(event: 'share' | 'paywall_click' | 'unlock'): void {
  const day = getOrCreateDay(getToday());
  if (event === 'share') day.shares++;
  else if (event === 'paywall_click') day.paywallClicks++;
  else if (event === 'unlock') day.unlocks++;
}

export function getStats(date?: string): Record<string, unknown> {
  const targetDate = date || getToday();
  const day = stats.get(targetDate);
  if (!day) return { date: targetDate, pageViews: 0, uniqueVisitors: 0, shares: 0, paywallClicks: 0, unlocks: 0, categoryViews: {} };
  return {
    date: day.date,
    pageViews: day.pageViews,
    uniqueVisitors: day.uniqueVisitors.size,
    shares: day.shares,
    paywallClicks: day.paywallClicks,
    unlocks: day.unlocks,
    categoryViews: day.categoryViews,
    conversionRate: day.paywallClicks > 0 ? ((day.unlocks / day.paywallClicks) * 100).toFixed(1) + '%' : '0%',
  };
}

export function getAllStats(): Record<string, unknown>[] {
  return Array.from(stats.keys())
    .sort()
    .slice(-7)
    .map((date) => getStats(date));
}
