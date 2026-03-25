'use client';

/**
 * Lightweight client-side analytics — fire-and-forget beacon calls.
 */
export function track(event: string, data?: Record<string, string>): void {
  if (typeof navigator === 'undefined') return;

  const body = JSON.stringify({ event, ...data });

  // Use sendBeacon for reliability (works even on page close)
  if (navigator.sendBeacon) {
    const blob = new Blob([body], { type: 'application/json' });
    navigator.sendBeacon('/api/analytics', blob);
  } else {
    fetch('/api/analytics', {
      method: 'POST',
      body,
      keepalive: true,
    }).catch(() => {});
  }
}

/**
 * Track client-side errors for debugging
 */
export function trackError(error: string, context?: string): void {
  track('client_error', {
    error: error.substring(0, 200),
    ...(context ? { context } : {}),
  });
}
