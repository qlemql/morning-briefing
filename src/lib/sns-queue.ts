/**
 * SNS Post Queue
 *
 * Stores formatted SNS posts in Redis lists for later consumption
 * when actual SNS API accounts are connected.
 *
 * Redis key pattern: mb:sns:queue:{platform}
 * Each item is a JSON-serialized SNSPost object.
 */

import { kvLpush, kvRpop, kvLlen, isRedisConfigured } from './kv';

export interface SNSPost {
  /** Platform: twitter, threads, instagram */
  platform: string;
  /** Briefing category: economy, investment, lifestyle */
  category: string;
  /** Formatted post content */
  content: string;
  /** ISO timestamp when the post was enqueued */
  createdAt: string;
  /** Briefing date (YYYY-MM-DD) */
  briefingDate: string;
}

const QUEUE_KEY_PREFIX = 'mb:sns:queue';

function queueKey(platform: string): string {
  return `${QUEUE_KEY_PREFIX}:${platform}`;
}

/**
 * Add a post to the platform queue (LPUSH — newest first).
 */
export async function enqueueSNSPost(
  platform: string,
  content: string,
  category: string,
  briefingDate: string,
): Promise<void> {
  const post: SNSPost = {
    platform,
    category,
    content,
    createdAt: new Date().toISOString(),
    briefingDate,
  };

  await kvLpush(queueKey(platform), JSON.stringify(post));
  console.log(`[SNS Queue] Enqueued ${platform}/${category} for ${briefingDate}`);
}

/**
 * Dequeue the oldest post from the platform queue (RPOP — FIFO).
 * Returns null if the queue is empty.
 */
export async function dequeueSNSPost(platform: string): Promise<SNSPost | null> {
  const raw = await kvRpop(queueKey(platform));
  if (!raw) return null;

  try {
    return JSON.parse(raw) as SNSPost;
  } catch {
    console.error('[SNS Queue] Failed to parse dequeued item:', raw);
    return null;
  }
}

/**
 * Get the number of pending posts for a platform.
 */
export async function getPendingCount(platform: string): Promise<number> {
  return kvLlen(queueKey(platform));
}

/**
 * Get pending counts for all platforms.
 */
export async function getAllPendingCounts(): Promise<Record<string, number>> {
  const platforms = ['twitter', 'threads', 'instagram'];
  const counts: Record<string, number> = {};

  for (const platform of platforms) {
    try {
      counts[platform] = await getPendingCount(platform);
    } catch {
      counts[platform] = 0;
    }
  }

  return counts;
}

/**
 * Check if Redis is available for queue operations.
 */
export function isQueueAvailable(): boolean {
  return isRedisConfigured();
}
