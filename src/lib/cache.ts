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
   * Get today's date in YYYY-MM-DD format
   */
  getTodayDate: (): string => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  },
};
