/**
 * User identity module.
 *
 * Phase 1 (current): Device-based anonymous ID (client localStorage).
 *   Server validates unlock status via Redis.
 * Phase 2 (post-사업자등록): Kakao OAuth → link device ID to account.
 *
 * Redis keys:
 *   mb:unlock:{userId}  → "YYYY-MM-DD"  (TTL 86400s — auto-expire)
 */

import { kvGet, kvSet } from './kv';

function kstToday(): string {
  return new Date(Date.now() + 9 * 3600 * 1000).toISOString().split('T')[0];
}

/**
 * Mark user as unlocked for today (after donation flow).
 */
export async function markUnlocked(userId: string): Promise<void> {
  await kvSet(`mb:unlock:${userId}`, kstToday(), 86400);
}

/**
 * Check if user has an active unlock for today.
 */
export async function isUnlocked(userId: string): Promise<boolean> {
  const val = await kvGet(`mb:unlock:${userId}`);
  return val === kstToday();
}
