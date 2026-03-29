/**
 * Watchlist utility — manages user's stock watchlist in localStorage
 * Max 5 tickers, stored as Yahoo Finance symbols (e.g., "005930.KS")
 */

const STORAGE_KEY = 'mb_watchlist';
const MAX_ITEMS = 5;

export function getWatchlist(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((t): t is string => typeof t === 'string').slice(0, MAX_ITEMS);
  } catch {
    return [];
  }
}

export function addToWatchlist(ticker: string): boolean {
  if (typeof window === 'undefined') return false;
  const list = getWatchlist();
  if (list.length >= MAX_ITEMS) return false;
  if (list.includes(ticker)) return false;
  list.push(ticker);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  return true;
}

export function removeFromWatchlist(ticker: string): void {
  if (typeof window === 'undefined') return;
  const list = getWatchlist().filter((t) => t !== ticker);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

export function isInWatchlist(ticker: string): boolean {
  return getWatchlist().includes(ticker);
}

export const WATCHLIST_MAX = MAX_ITEMS;
