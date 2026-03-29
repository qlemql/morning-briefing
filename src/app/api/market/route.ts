import { NextResponse } from 'next/server';

/**
 * GET /api/market — fetch market snapshot data
 *
 * Sources: Yahoo Finance v8 API (free, no auth)
 * Symbols: ^KS11 (KOSPI), ^KQ11 (KOSDAQ), KRW=X (USD/KRW), BTC-USD, ^GSPC (S&P500)
 *
 * Cache: 10 min via s-maxage + stale-while-revalidate
 * No Claude API calls — pure market data fetch.
 */

interface MarketItem {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
}

const SYMBOLS = [
  { yahoo: '^KS11', name: '코스피' },
  { yahoo: '^KQ11', name: '코스닥' },
  { yahoo: 'KRW=X', name: '원/달러' },
  { yahoo: 'BTC-USD', name: 'BTC' },
  { yahoo: '^GSPC', name: 'S&P500' },
];

async function fetchYahooFinance(): Promise<MarketItem[]> {
  const symbolList = SYMBOLS.map((s) => s.yahoo).join(',');
  const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbolList)}&fields=regularMarketPrice,regularMarketChange,regularMarketChangePercent,shortName`;

  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; MorningBriefing/1.0)',
    },
    signal: AbortSignal.timeout(8000),
  });

  if (!res.ok) {
    throw new Error(`Yahoo Finance responded with ${res.status}`);
  }

  const json = await res.json();
  const quotes = json?.quoteResponse?.result;

  if (!Array.isArray(quotes) || quotes.length === 0) {
    throw new Error('No quote data returned from Yahoo Finance');
  }

  return SYMBOLS.map((sym) => {
    const q = quotes.find(
      (quote: Record<string, unknown>) => quote.symbol === sym.yahoo,
    );
    if (!q) {
      return {
        symbol: sym.yahoo,
        name: sym.name,
        price: 0,
        change: 0,
        changePercent: 0,
      };
    }
    return {
      symbol: sym.yahoo,
      name: sym.name,
      price: q.regularMarketPrice ?? 0,
      change: q.regularMarketChange ?? 0,
      changePercent: q.regularMarketChangePercent ?? 0,
    };
  });
}

// In-memory cache for serverless edge case
let memoryCache: { data: MarketItem[]; timestamp: number } | null = null;
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

export async function GET(): Promise<NextResponse> {
  try {
    // Check in-memory cache first
    if (memoryCache && Date.now() - memoryCache.timestamp < CACHE_TTL_MS) {
      return NextResponse.json(
        {
          meta: { version: '1.0', status: 'success', cached: true },
          data: memoryCache.data,
        },
        {
          status: 200,
          headers: {
            'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=300',
          },
        },
      );
    }

    const data = await fetchYahooFinance();

    // Update in-memory cache
    memoryCache = { data, timestamp: Date.now() };

    return NextResponse.json(
      {
        meta: { version: '1.0', status: 'success', cached: false },
        data,
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=300',
        },
      },
    );
  } catch (err) {
    // If we have stale cache, serve it on error
    if (memoryCache) {
      return NextResponse.json(
        {
          meta: { version: '1.0', status: 'success', cached: true, stale: true },
          data: memoryCache.data,
        },
        {
          status: 200,
          headers: {
            'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=600',
          },
        },
      );
    }

    console.error('[market] fetch failed:', err);
    return NextResponse.json(
      {
        meta: { version: '1.0', status: 'error' },
        error: { code: 'FETCH_FAILED', message: 'Failed to fetch market data' },
      },
      { status: 502 },
    );
  }
}
