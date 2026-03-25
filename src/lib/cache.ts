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
   * Clean up old cache entries (keep only last 3 days)
   * Should be called periodically to prevent localStorage bloat
   */
  cleanupOldCache: (): void => {
    if (typeof window === 'undefined') return;
    try {
      const today = new Date(Date.now() + 9 * 3600 * 1000);
      const threeDaysAgo = new Date(today);
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
      const cutoff = threeDaysAgo.toISOString().split('T')[0];

      Object.keys(localStorage).forEach((key) => {
        if (!key.startsWith('briefing_')) return;
        // Extract date from key: briefing_{category}_{YYYY-MM-DD}
        const dateMatch = key.match(/\d{4}-\d{2}-\d{2}$/);
        if (dateMatch && dateMatch[0] < cutoff) {
          localStorage.removeItem(key);
        }
      });
    } catch {
      // cleanup is non-critical
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

  // ── 7-Day Free Trial ──

  /**
   * Get the date when the user first visited (trial start)
   * Returns ISO date string (YYYY-MM-DD) or null
   */
  getTrialStartDate: (): string | null => {
    if (typeof window === 'undefined') return null;
    try {
      return localStorage.getItem('mb_trial_start');
    } catch {
      return null;
    }
  },

  /**
   * Initialize trial start date if not already set
   * Returns the trial start date
   */
  initTrial: (): string => {
    if (typeof window === 'undefined') return CacheUtils.getTodayDate();
    try {
      const existing = localStorage.getItem('mb_trial_start');
      if (existing) return existing;
      const today = CacheUtils.getTodayDate();
      localStorage.setItem('mb_trial_start', today);
      return today;
    } catch {
      return CacheUtils.getTodayDate();
    }
  },

  /**
   * Check if user is within 7-day trial period
   */
  isInTrialPeriod: (): boolean => {
    if (typeof window === 'undefined') return true;
    try {
      const startStr = localStorage.getItem('mb_trial_start');
      if (!startStr) return true; // No start date = first visit = trial active
      const start = new Date(startStr + 'T00:00:00+09:00');
      const now = new Date(Date.now() + 9 * 3600 * 1000);
      const diffDays = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      return diffDays < 7;
    } catch {
      return true;
    }
  },

  /**
   * Get remaining trial days (0 = trial expired)
   */
  getTrialDaysRemaining: (): number => {
    if (typeof window === 'undefined') return 7;
    try {
      const startStr = localStorage.getItem('mb_trial_start');
      if (!startStr) return 7;
      const start = new Date(startStr + 'T00:00:00+09:00');
      const now = new Date(Date.now() + 9 * 3600 * 1000);
      const diffDays = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      return Math.max(0, 7 - diffDays);
    } catch {
      return 7;
    }
  },

  /**
   * Check if user has an active subscription
   */
  isSubscribed: (): boolean => {
    if (typeof window === 'undefined') return false;
    try {
      return localStorage.getItem('mb_subscribed') === 'true';
    } catch {
      return false;
    }
  },

  /**
   * Set subscription status
   */
  setSubscribed: (subscribed: boolean): void => {
    if (typeof window === 'undefined') return;
    try {
      if (subscribed) {
        localStorage.setItem('mb_subscribed', 'true');
      } else {
        localStorage.removeItem('mb_subscribed');
      }
    } catch {
      // non-critical
    }
  },
};
