import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/watchlist?tickers=005930.KS,000660.KS
 *
 * Fetches real-time quotes for user's watchlist tickers via Yahoo Finance.
 * No Claude API calls — pure market data.
 * Cache: 10 min in-memory + CDN s-maxage.
 */

export interface WatchlistQuote {
  ticker: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  marketState: string; // "REGULAR" | "PRE" | "POST" | "CLOSED"
  currency: string;
}

// In-memory cache keyed by sorted ticker string
const cache = new Map<string, { data: WatchlistQuote[]; timestamp: number }>();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes
const MAX_TICKERS = 5;

export async function GET(request: NextRequest): Promise<NextResponse> {
  const tickersParam = request.nextUrl.searchParams.get('tickers');

  if (!tickersParam) {
    return NextResponse.json(
      {
        meta: { version: '1.0', status: 'error' },
        error: { code: 'MISSING_PARAM', message: 'Missing tickers parameter' },
      },
      { status: 400 },
    );
  }

  // Validate and limit tickers
  const tickers = tickersParam
    .split(',')
    .map((t) => t.trim())
    .filter((t) => /^[A-Z0-9^=.-]+$/i.test(t))
    .slice(0, MAX_TICKERS);

  if (tickers.length === 0) {
    return NextResponse.json(
      {
        meta: { version: '1.0', status: 'error' },
        error: { code: 'INVALID_TICKERS', message: 'No valid tickers provided' },
      },
      { status: 400 },
    );
  }

  const cacheKey = [...tickers].sort().join(',');

  // Check in-memory cache
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return NextResponse.json(
      {
        meta: { version: '1.0', status: 'success', cached: true },
        data: cached.data,
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=300',
        },
      },
    );
  }

  try {
    const symbolList = tickers.join(',');
    const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbolList)}&fields=regularMarketPrice,regularMarketChange,regularMarketChangePercent,shortName,longName,marketState,currency`;

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

    if (!Array.isArray(quotes)) {
      throw new Error('Invalid Yahoo Finance response');
    }

    const data: WatchlistQuote[] = tickers.map((ticker) => {
      const q = quotes.find(
        (quote: Record<string, unknown>) => quote.symbol === ticker,
      );
      if (!q) {
        return {
          ticker,
          name: ticker,
          price: 0,
          change: 0,
          changePercent: 0,
          marketState: 'CLOSED',
          currency: 'KRW',
        };
      }
      return {
        ticker,
        name: (q.longName || q.shortName || ticker) as string,
        price: (q.regularMarketPrice ?? 0) as number,
        change: (q.regularMarketChange ?? 0) as number,
        changePercent: (q.regularMarketChangePercent ?? 0) as number,
        marketState: (q.marketState || 'CLOSED') as string,
        currency: (q.currency || 'KRW') as string,
      };
    });

    // Update cache
    cache.set(cacheKey, { data, timestamp: Date.now() });

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
    // Serve stale cache on error
    if (cached) {
      return NextResponse.json(
        {
          meta: { version: '1.0', status: 'success', cached: true, stale: true },
          data: cached.data,
        },
        {
          status: 200,
          headers: {
            'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=600',
          },
        },
      );
    }

    console.error('[watchlist] fetch failed:', err);
    return NextResponse.json(
      {
        meta: { version: '1.0', status: 'error' },
        error: { code: 'FETCH_FAILED', message: 'Failed to fetch watchlist data' },
      },
      { status: 502 },
    );
  }
}
