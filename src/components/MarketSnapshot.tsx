'use client';

import { useState, useEffect, useRef } from 'react';

interface MarketItem {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
}

function formatPrice(symbol: string, price: number): string {
  if (price === 0) return '-';

  // KRW-based indices: no decimals
  if (symbol === '^KS11' || symbol === '^KQ11') {
    return price.toLocaleString('ko-KR', { maximumFractionDigits: 2 });
  }
  // USD/KRW exchange rate
  if (symbol === 'KRW=X') {
    return price.toLocaleString('ko-KR', { maximumFractionDigits: 1 });
  }
  // BTC: no decimals (large number)
  if (symbol === 'BTC-USD') {
    return `$${price.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
  }
  // S&P500
  if (symbol === '^GSPC') {
    return price.toLocaleString('en-US', { maximumFractionDigits: 2 });
  }
  return price.toLocaleString();
}

function formatPercent(pct: number): string {
  const abs = Math.abs(pct);
  return abs.toFixed(2) + '%';
}

/** Skeleton pill for loading state */
function PillSkeleton() {
  return (
    <div className="flex-shrink-0 rounded-xl bg-gray-100 dark:bg-gray-800 px-4 py-2.5 w-[130px] h-[58px] skeleton-shimmer" />
  );
}

export default function MarketSnapshot() {
  const [items, setItems] = useState<MarketItem[] | null>(null);
  const [failed, setFailed] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch('/api/market', { signal: AbortSignal.timeout(10000) });
        if (!res.ok) throw new Error('API error');
        const json = await res.json();
        if (!cancelled && json.data) {
          setItems(json.data);
        }
      } catch {
        if (!cancelled) setFailed(true);
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  // Graceful hide on failure
  if (failed) return null;

  return (
    <div className="mb-1">
      <div
        ref={scrollRef}
        className="flex gap-2 overflow-x-auto scrollbar-hide pb-1 -mx-4 px-4"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        {!items ? (
          // Loading skeleton
          <>
            <PillSkeleton />
            <PillSkeleton />
            <PillSkeleton />
            <PillSkeleton />
          </>
        ) : (
          items.map((item) => {
            const isUp = item.change > 0;
            const isDown = item.change < 0;
            const isFlat = item.change === 0;

            // Korean convention: up=red, down=blue
            const colorClasses = isUp
              ? 'text-red-500 dark:text-red-400'
              : isDown
                ? 'text-blue-500 dark:text-blue-400'
                : 'text-gray-400 dark:text-gray-500';

            const bgClasses = isUp
              ? 'bg-red-50 dark:bg-red-950/30 border-red-100 dark:border-red-900/40'
              : isDown
                ? 'bg-blue-50 dark:bg-blue-950/30 border-blue-100 dark:border-blue-900/40'
                : 'bg-gray-50 dark:bg-gray-800/50 border-gray-100 dark:border-gray-700';

            const arrow = isUp ? '\u25B2' : isDown ? '\u25BC' : '';

            return (
              <div
                key={item.symbol}
                className={`flex-shrink-0 rounded-xl border px-3.5 py-2 min-w-[120px] ${bgClasses}`}
              >
                <p className="text-[11px] font-medium text-gray-500 dark:text-gray-400 mb-0.5 truncate">
                  {item.name}
                </p>
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 leading-tight">
                  {formatPrice(item.symbol, item.price)}
                </p>
                <p className={`text-[11px] font-medium leading-tight mt-0.5 ${colorClasses}`}>
                  {arrow}{isFlat ? '-' : ''} {!isFlat && formatPercent(item.changePercent)}
                </p>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
