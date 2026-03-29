'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { getWatchlist, addToWatchlist, removeFromWatchlist, WATCHLIST_MAX } from '@/lib/watchlist';
import { searchStocks, KR_STOCKS, type KrStock } from '@/data/kr-stocks';
import type { WatchlistQuote } from '@/app/api/watchlist/route';

/** Format KRW price with commas, no decimals */
function formatKrwPrice(price: number): string {
  if (price === 0) return '-';
  return price.toLocaleString('ko-KR', { maximumFractionDigits: 0 });
}

function formatPercent(pct: number): string {
  return Math.abs(pct).toFixed(2) + '%';
}

/** Find Korean name from our stock dictionary */
function getStockName(ticker: string): string {
  const stock = KR_STOCKS.find((s) => s.ticker === ticker);
  return stock?.name || ticker;
}

// ─── Skeleton ────────────────────────────────────────────────
function WatchlistSkeleton() {
  return (
    <div className="space-y-2">
      {[1, 2].map((i) => (
        <div
          key={i}
          className="flex items-center justify-between rounded-xl bg-gray-100 dark:bg-gray-800 px-4 py-3 h-[60px] skeleton-shimmer"
        />
      ))}
    </div>
  );
}

// ─── Search Modal ────────────────────────────────────────────
function SearchModal({
  isOpen,
  onClose,
  onSelect,
  currentTickers,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (ticker: string) => void;
  currentTickers: string[];
}) {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const results = query ? searchStocks(query).slice(0, 10) : [];

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      // Delay focus to allow modal animation
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 dark:bg-black/60" />

      {/* Modal */}
      <div
        className="relative w-full max-w-md mx-4 mb-4 sm:mb-0 bg-white dark:bg-[#1c1c1e] rounded-2xl shadow-xl overflow-hidden animate-fade-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
            종목 추가
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1"
            aria-label="닫기"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Search input */}
        <div className="px-4 pb-2">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="종목명 검색 (예: 삼성전자)"
            className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-4 py-2.5 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 outline-none focus:border-gray-400 dark:focus:border-gray-500 transition-colors"
          />
          <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1.5 px-1">
            최대 {WATCHLIST_MAX}개 · {currentTickers.length}/{WATCHLIST_MAX}개 등록됨
          </p>
        </div>

        {/* Results */}
        <div className="max-h-[300px] overflow-y-auto px-2 pb-3">
          {query && results.length === 0 && (
            <p className="text-center text-sm text-gray-400 dark:text-gray-500 py-6">
              검색 결과가 없습니다<br />
              <span className="text-xs">주요 50개 종목만 지원됩니다</span>
            </p>
          )}
          {results.map((stock) => {
            const alreadyAdded = currentTickers.includes(stock.ticker);
            const isFull = currentTickers.length >= WATCHLIST_MAX && !alreadyAdded;
            return (
              <button
                key={stock.ticker}
                disabled={alreadyAdded || isFull}
                onClick={() => {
                  onSelect(stock.ticker);
                  onClose();
                }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left transition-colors ${
                  alreadyAdded
                    ? 'opacity-40 cursor-not-allowed'
                    : isFull
                      ? 'opacity-40 cursor-not-allowed'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-800 active:bg-gray-100 dark:active:bg-gray-700'
                }`}
              >
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {stock.name}
                  </p>
                  <p className="text-[11px] text-gray-400 dark:text-gray-500">
                    {stock.ticker} · {stock.market}
                  </p>
                </div>
                {alreadyAdded && (
                  <span className="text-[11px] text-gray-400 dark:text-gray-500">
                    추가됨
                  </span>
                )}
              </button>
            );
          })}

          {/* Show popular when no query */}
          {!query && (
            <>
              <p className="text-[11px] text-gray-400 dark:text-gray-500 px-3 pt-2 pb-1 font-medium">
                인기 종목
              </p>
              {KR_STOCKS.slice(0, 8).map((stock) => {
                const alreadyAdded = currentTickers.includes(stock.ticker);
                const isFull = currentTickers.length >= WATCHLIST_MAX && !alreadyAdded;
                return (
                  <button
                    key={stock.ticker}
                    disabled={alreadyAdded || isFull}
                    onClick={() => {
                      onSelect(stock.ticker);
                      onClose();
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left transition-colors ${
                      alreadyAdded
                        ? 'opacity-40 cursor-not-allowed'
                        : isFull
                          ? 'opacity-40 cursor-not-allowed'
                          : 'hover:bg-gray-50 dark:hover:bg-gray-800 active:bg-gray-100 dark:active:bg-gray-700'
                    }`}
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {stock.name}
                      </p>
                      <p className="text-[11px] text-gray-400 dark:text-gray-500">
                        {stock.ticker} · {stock.market}
                      </p>
                    </div>
                    {alreadyAdded && (
                      <span className="text-[11px] text-gray-400 dark:text-gray-500">
                        추가됨
                      </span>
                    )}
                  </button>
                );
              })}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────
export default function WatchlistSection() {
  const [tickers, setTickers] = useState<string[]>([]);
  const [quotes, setQuotes] = useState<WatchlistQuote[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [showSearch, setShowSearch] = useState(false);

  // Load watchlist from localStorage on mount
  useEffect(() => {
    setTickers(getWatchlist());
  }, []);

  // Fetch quotes when tickers change
  const fetchQuotes = useCallback(async (tickerList: string[]) => {
    if (tickerList.length === 0) {
      setQuotes(null);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(
        `/api/watchlist?tickers=${encodeURIComponent(tickerList.join(','))}`,
        { signal: AbortSignal.timeout(10000) },
      );
      if (!res.ok) throw new Error('API error');
      const json = await res.json();
      if (json.data) {
        setQuotes(json.data);
      }
    } catch {
      // Silently fail — keep stale quotes if any
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchQuotes(tickers);
  }, [tickers, fetchQuotes]);

  const handleAdd = useCallback((ticker: string) => {
    const success = addToWatchlist(ticker);
    if (success) {
      setTickers(getWatchlist());
    }
  }, []);

  const handleRemove = useCallback((ticker: string) => {
    removeFromWatchlist(ticker);
    setTickers(getWatchlist());
    setQuotes((prev) => prev?.filter((q) => q.ticker !== ticker) ?? null);
  }, []);

  return (
    <section className="mt-6 mb-2">
      {/* Section header */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-1.5">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-500" aria-hidden="true">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
          내 관심종목
        </h2>
        {tickers.length < WATCHLIST_MAX && (
          <button
            onClick={() => setShowSearch(true)}
            className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors active:scale-95"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            종목 추가
          </button>
        )}
      </div>

      {/* Empty state */}
      {tickers.length === 0 && !loading && (
        <button
          onClick={() => setShowSearch(true)}
          className="w-full rounded-xl border border-dashed border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1c1c1e] py-6 text-center transition-colors hover:border-gray-300 dark:hover:border-gray-600 active:scale-[0.99]"
        >
          <p className="text-sm text-gray-400 dark:text-gray-500">
            관심 종목을 추가해보세요
          </p>
          <p className="text-[11px] text-gray-300 dark:text-gray-600 mt-1">
            최대 {WATCHLIST_MAX}개까지 등록할 수 있어요
          </p>
        </button>
      )}

      {/* Loading skeleton */}
      {tickers.length > 0 && loading && !quotes && <WatchlistSkeleton />}

      {/* Quote list */}
      {quotes && quotes.length > 0 && (
        <div className="space-y-2">
          {quotes.map((q) => {
            const isUp = q.change > 0;
            const isDown = q.change < 0;

            // Korean convention: up=red, down=blue
            const changeColor = isUp
              ? 'text-red-500 dark:text-red-400'
              : isDown
                ? 'text-blue-500 dark:text-blue-400'
                : 'text-gray-400 dark:text-gray-500';

            const bgColor = isUp
              ? 'bg-red-50/50 dark:bg-red-950/20 border-red-100 dark:border-red-900/30'
              : isDown
                ? 'bg-blue-50/50 dark:bg-blue-950/20 border-blue-100 dark:border-blue-900/30'
                : 'bg-white dark:bg-[#1c1c1e] border-gray-100 dark:border-gray-800';

            const arrow = isUp ? '\u25B2' : isDown ? '\u25BC' : '';
            const displayName = getStockName(q.ticker);

            return (
              <div
                key={q.ticker}
                className={`flex items-center justify-between rounded-xl border px-4 py-3 transition-colors ${bgColor}`}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                    {displayName}
                  </p>
                  <p className="text-[11px] text-gray-400 dark:text-gray-500">
                    {q.ticker.replace('.KS', '').replace('.KQ', '')}
                    {q.marketState !== 'REGULAR' && (
                      <span className="ml-1.5 text-gray-300 dark:text-gray-600">
                        장마감
                      </span>
                    )}
                  </p>
                </div>
                <div className="text-right mr-3">
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 tabular-nums">
                    {formatKrwPrice(q.price)}
                  </p>
                  <p className={`text-[11px] font-medium tabular-nums ${changeColor}`}>
                    {arrow} {q.change !== 0 ? formatPercent(q.changePercent) : '-'}
                  </p>
                </div>
                <button
                  onClick={() => handleRemove(q.ticker)}
                  className="text-gray-300 dark:text-gray-600 hover:text-red-400 dark:hover:text-red-400 transition-colors p-1 -mr-1"
                  aria-label={`${displayName} 삭제`}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Disclaimer */}
      {quotes && quotes.length > 0 && (
        <p className="text-[10px] text-gray-300 dark:text-gray-600 mt-2 text-center">
          시세는 지연될 수 있으며, 투자 판단의 근거로 사용하지 마세요
        </p>
      )}

      {/* Search modal */}
      <SearchModal
        isOpen={showSearch}
        onClose={() => setShowSearch(false)}
        onSelect={handleAdd}
        currentTickers={tickers}
      />
    </section>
  );
}
