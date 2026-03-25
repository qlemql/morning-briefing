/**
 * Simple rate limiter using Redis (Upstash) or in-memory fallback.
 *
 * Sliding window counter pattern:
 *   Key: mb:rl:{identifier}:{window}
 *   Value: INCR with TTL = windowSeconds
 *
 * Usage:
 *   const { success, remaining } = await rateLimit('api', ip, 10, 60);
 *   // 10 requests per 60 seconds per IP
 */

import { kvIncr, kvExpire, isRedisConfigured } from './kv';

interface RateLimitResult {
  success: boolean;
  remaining: number;
  limit: number;
}

// In-memory fallback for rate limiting (when Redis is not configured)
const memCounts = new Map<string, { count: number; resetAt: number }>();

export async function rateLimit(
  prefix: string,
  identifier: string,
  maxRequests: number,
  windowSeconds: number,
): Promise<RateLimitResult> {
  const window = Math.floor(Date.now() / (windowSeconds * 1000));
  const key = `mb:rl:${prefix}:${identifier}:${window}`;

  if (isRedisConfigured()) {
    const count = await kvIncr(key);
    if (count === 1) {
      await kvExpire(key, windowSeconds + 1);
    }
    return {
      success: count <= maxRequests,
      remaining: Math.max(0, maxRequests - count),
      limit: maxRequests,
    };
  }

  // In-memory fallback
  const now = Date.now();
  const entry = memCounts.get(key);
  if (!entry || entry.resetAt <= now) {
    memCounts.set(key, { count: 1, resetAt: now + windowSeconds * 1000 });
    return { success: true, remaining: maxRequests - 1, limit: maxRequests };
  }
  entry.count++;
  return {
    success: entry.count <= maxRequests,
    remaining: Math.max(0, maxRequests - entry.count),
    limit: maxRequests,
  };
}

/**
 * Pre-configured rate limiters for the app.
 */
export async function rateLimitBriefing(ip: string): Promise<RateLimitResult> {
  // 5 briefing generation requests per minute per IP
  return rateLimit('briefing', ip, 5, 60);
}

export async function rateLimitAnalytics(ip: string): Promise<RateLimitResult> {
  // 30 analytics events per minute per IP
  return rateLimit('analytics', ip, 30, 60);
}

export async function rateLimitSubscribe(ip: string): Promise<RateLimitResult> {
  // 3 subscribe attempts per hour per IP
  return rateLimit('subscribe', ip, 3, 3600);
}
