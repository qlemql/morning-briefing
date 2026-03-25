import { BriefingCategory } from './types';

/**
 * Cache utility for localStorage-based caching
 * Uses format: briefing_{category}_{YYYY-MM-DD}
 */

export const CacheKeys = {
  getBriefingKey: (category: string, date: string) =>
    `briefing_${category}_${date}`,
} as const;

export const CacheUtils = {
  /**
   * Get cached briefing for a category on a specific date
   */
  getBriefing: (
    category: string,
    date: string,
  ): BriefingCategory | null => {
    if (typeof window === 'undefined') return null;

    try {
      const key = CacheKeys.getBriefingKey(category, date);
      const cached = localStorage.getItem(key);

      if (!cached) return null;

      return JSON.parse(cached) as BriefingCategory;
    } catch (error) {
      console.error('Cache retrieval error:', error);
      return null;
    }
  },

  /**
   * Set cached briefing for a category on a specific date
   */
  setBriefing: (
    category: string,
    date: string,
    data: BriefingCategory,
  ): void => {
    if (typeof window === 'undefined') return;

    try {
      const key = CacheKeys.getBriefingKey(category, date);
      localStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
      console.error('Cache storage error:', error);
    }
  },

  /**
   * Clear cache for a specific category and date
   */
  clearBriefing: (category: string, date: string): void => {
    if (typeof window === 'undefined') return;

    try {
      const key = CacheKeys.getBriefingKey(category, date);
      localStorage.removeItem(key);
    } catch (error) {
      console.error('Cache clear error:', error);
    }
  },

  /**
   * Clear all briefing cache
   */
  clearAll: (): void => {
    if (typeof window === 'undefined') return;

    try {
      Object.keys(localStorage).forEach((key) => {
        if (key.startsWith('briefing_')) {
          localStorage.removeItem(key);
        }
      });
    } catch (error) {
      console.error('Cache clear all error:', error);
    }
  },

  /**
   * Get today's date in YYYY-MM-DD format (KST)
   */
  getTodayDate: (): string => {
    const now = new Date(Date.now() + 9 * 3600 * 1000);
    return now.toISOString().split('T')[0];
  },

  /**
   * Check if premium is unlocked for today
   */
  isPremiumUnlocked: (): boolean => {
    if (typeof window === 'undefined') return false;
    try {
      const stored = localStorage.getItem('premium_unlock_date');
      return stored === CacheUtils.getTodayDate();
    } catch {
      return false;
    }
  },

  /**
   * Mark premium as unlocked for today + store HMAC tokens from server
   */
  setPremiumUnlocked: (tokens?: Record<string, string>): void => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem('premium_unlock_date', CacheUtils.getTodayDate());
      if (tokens) {
        localStorage.setItem('premium_tokens', JSON.stringify(tokens));
      }
    } catch (error) {
      console.error('Premium unlock save error:', error);
    }
  },

  /**
   * Get server-signed unlock token for API request
   */
  getUnlockToken: (category: string): string => {
    if (!CacheUtils.isPremiumUnlocked()) return '';
    try {
      const tokensStr = localStorage.getItem('premium_tokens');
      if (!tokensStr) return '';
      const tokens = JSON.parse(tokensStr) as Record<string, string>;
      return tokens[category] || '';
    } catch {
      return '';
    }
  },
};
