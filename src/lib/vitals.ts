'use client';

/**
 * Core Web Vitals reporting.
 * Sends LCP, FID, CLS metrics to analytics endpoint.
 * Uses PerformanceObserver API (supported in modern browsers).
 */
export function reportWebVitals(): void {
  if (typeof window === 'undefined' || !('PerformanceObserver' in window)) return;

  // LCP — Largest Contentful Paint
  try {
    const lcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1] as PerformanceEntry & { startTime: number };
      if (lastEntry) {
        sendMetric('LCP', Math.round(lastEntry.startTime));
      }
    });
    lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
  } catch {
    // Not supported
  }

  // FID — First Input Delay
  try {
    const fidObserver = new PerformanceObserver((list) => {
      const entry = list.getEntries()[0] as PerformanceEntry & { processingStart: number; startTime: number };
      if (entry) {
        sendMetric('FID', Math.round(entry.processingStart - entry.startTime));
      }
    });
    fidObserver.observe({ type: 'first-input', buffered: true });
  } catch {
    // Not supported
  }

  // CLS — Cumulative Layout Shift
  try {
    let clsValue = 0;
    const clsObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const layoutShift = entry as PerformanceEntry & { hadRecentInput: boolean; value: number };
        if (!layoutShift.hadRecentInput) {
          clsValue += layoutShift.value;
        }
      }
    });
    clsObserver.observe({ type: 'layout-shift', buffered: true });

    // Report CLS on page hide
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        sendMetric('CLS', Math.round(clsValue * 1000));
      }
    }, { once: true });
  } catch {
    // Not supported
  }
}

function sendMetric(name: string, value: number): void {
  if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
    const body = JSON.stringify({ event: 'web_vital', name, value: String(value) });
    const blob = new Blob([body], { type: 'application/json' });
    navigator.sendBeacon('/api/analytics', blob);
  }
}
