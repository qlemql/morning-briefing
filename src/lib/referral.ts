'use client';

import { CacheUtils } from './cache';

const REFERRAL_CODE_KEY = 'mb_referral_code';
const REFERRAL_SELF_KEY = 'mb_referral_self'; // 자기 코드로 접속 방지
const BASE_URL = 'https://morning-briefing-mocha.vercel.app';
const MAX_BONUS_DAYS = 7;

/**
 * Generate a random 6-character alphanumeric referral code.
 */
function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // 혼동 문자 제외 (0/O, 1/I)
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

/**
 * Get or create the user's referral code (persisted in localStorage).
 */
export function getReferralCode(): string {
  if (typeof window === 'undefined') return '';
  try {
    const existing = localStorage.getItem(REFERRAL_CODE_KEY);
    if (existing) return existing;
    const code = generateCode();
    localStorage.setItem(REFERRAL_CODE_KEY, code);
    return code;
  } catch {
    return '';
  }
}

/**
 * Get the full referral link.
 */
export function getReferralLink(): string {
  const code = getReferralCode();
  if (!code) return BASE_URL;
  return `${BASE_URL}/?ref=${code}`;
}

/**
 * Mark this browser as the owner of a referral code (self-referral prevention).
 */
export function markSelfCode(code: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(REFERRAL_SELF_KEY, code);
  } catch {
    // non-critical
  }
}

/**
 * Check if the given code is the user's own code.
 */
export function isSelfReferral(code: string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const myCode = localStorage.getItem(REFERRAL_CODE_KEY);
    const selfCode = localStorage.getItem(REFERRAL_SELF_KEY);
    return code === myCode || code === selfCode;
  } catch {
    return false;
  }
}

/**
 * Apply referral bonus: extend trial end date by bonus days.
 * Reads bonus from server and extends trial.
 */
export function applyReferralBonus(bonusDays: number): void {
  if (typeof window === 'undefined' || bonusDays <= 0) return;
  try {
    const capped = Math.min(bonusDays, MAX_BONUS_DAYS);
    localStorage.setItem('mb_referral_bonus_days', String(capped));
  } catch {
    // non-critical
  }
}

/**
 * Get stored referral bonus days.
 */
export function getReferralBonusDays(): number {
  if (typeof window === 'undefined') return 0;
  try {
    return parseInt(localStorage.getItem('mb_referral_bonus_days') || '0', 10);
  } catch {
    return 0;
  }
}

/**
 * Check if user is within trial period INCLUDING referral bonus.
 * Extends the base 7-day trial by bonus days.
 */
export function isInExtendedTrialPeriod(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    const startStr = localStorage.getItem('mb_trial_start');
    if (!startStr) return true;
    const start = new Date(startStr + 'T00:00:00+09:00');
    const now = new Date(Date.now() + 9 * 3600 * 1000);
    const diffDays = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    const bonusDays = getReferralBonusDays();
    return diffDays < (7 + bonusDays);
  } catch {
    return true;
  }
}

/**
 * Get extended trial days remaining (base 7 + bonus).
 */
export function getExtendedTrialDaysRemaining(): number {
  if (typeof window === 'undefined') return 7;
  try {
    const startStr = localStorage.getItem('mb_trial_start');
    if (!startStr) return 7;
    const start = new Date(startStr + 'T00:00:00+09:00');
    const now = new Date(Date.now() + 9 * 3600 * 1000);
    const diffDays = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    const bonusDays = getReferralBonusDays();
    return Math.max(0, (7 + bonusDays) - diffDays);
  } catch {
    return 7;
  }
}

/**
 * Register a referral: call the API to record that someone used a ref code.
 * Returns true if successfully registered.
 */
export async function registerReferral(code: string): Promise<boolean> {
  if (!code || isSelfReferral(code)) return false;

  // Check if already registered this referral
  const registeredKey = `mb_ref_registered_${code}`;
  if (typeof window !== 'undefined' && localStorage.getItem(registeredKey)) return false;

  try {
    const res = await fetch('/api/referral', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, action: 'register' }),
    });
    if (res.ok) {
      // Mark as registered to prevent duplicate
      if (typeof window !== 'undefined') {
        localStorage.setItem(registeredKey, '1');
      }
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Fetch referral stats from the server.
 */
export async function fetchReferralStats(code: string): Promise<{
  invited: number;
  bonusDays: number;
}> {
  if (!code) return { invited: 0, bonusDays: 0 };
  try {
    const res = await fetch(`/api/referral?code=${encodeURIComponent(code)}`);
    if (!res.ok) return { invited: 0, bonusDays: 0 };
    const data = await res.json();
    return {
      invited: data.invited ?? 0,
      bonusDays: data.bonusDays ?? 0,
    };
  } catch {
    return { invited: 0, bonusDays: 0 };
  }
}
