/**
 * Persistent key-value storage layer.
 *
 * Strategy:
 *  - If UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN are set → use Upstash Redis
 *  - Otherwise → graceful in-memory fallback (for local dev / before Redis is configured)
 *
 * All functions are async so callers don't need to know which backend is active.
 */

/* ---------- Upstash REST helper (zero-dependency) ---------- */

const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
const USE_REDIS = !!(REDIS_URL && REDIS_TOKEN);

async function redis<T = unknown>(
  command: string[],
): Promise<T> {
  if (!REDIS_URL || !REDIS_TOKEN) throw new Error('Redis not configured');
  const res = await fetch(`${REDIS_URL}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${REDIS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(command),
    cache: 'no-store',
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Redis error ${res.status}: ${text}`);
  }
  const data = await res.json();
  return data.result as T;
}

/* ---------- In-memory fallback ---------- */

const mem = new Map<string, string>();

/* ---------- Public API ---------- */

export async function kvGet(key: string): Promise<string | null> {
  if (USE_REDIS) return redis<string | null>(['GET', key]);
  return mem.get(key) ?? null;
}

export async function kvSet(key: string, value: string, ttlSeconds?: number): Promise<void> {
  if (USE_REDIS) {
    if (ttlSeconds) {
      await redis(['SET', key, value, 'EX', String(ttlSeconds)]);
    } else {
      await redis(['SET', key, value]);
    }
    return;
  }
  mem.set(key, value);
}

export async function kvIncr(key: string): Promise<number> {
  if (USE_REDIS) return redis<number>(['INCR', key]);
  const val = parseInt(mem.get(key) || '0', 10) + 1;
  mem.set(key, String(val));
  return val;
}

export async function kvSadd(key: string, member: string): Promise<number> {
  if (USE_REDIS) return redis<number>(['SADD', key, member]);
  // In-memory set simulation via JSON
  const raw = mem.get(key);
  const set: string[] = raw ? JSON.parse(raw) : [];
  if (set.includes(member)) return 0;
  set.push(member);
  mem.set(key, JSON.stringify(set));
  return 1;
}

export async function kvScard(key: string): Promise<number> {
  if (USE_REDIS) return redis<number>(['SCARD', key]);
  const raw = mem.get(key);
  return raw ? (JSON.parse(raw) as string[]).length : 0;
}

export async function kvSmembers(key: string): Promise<string[]> {
  if (USE_REDIS) return redis<string[]>(['SMEMBERS', key]);
  const raw = mem.get(key);
  return raw ? (JSON.parse(raw) as string[]) : [];
}

export async function kvHincrby(key: string, field: string, increment: number): Promise<number> {
  if (USE_REDIS) return redis<number>(['HINCRBY', key, field, String(increment)]);
  const raw = mem.get(key);
  const hash: Record<string, number> = raw ? JSON.parse(raw) : {};
  hash[field] = (hash[field] || 0) + increment;
  mem.set(key, JSON.stringify(hash));
  return hash[field];
}

export async function kvHgetall(key: string): Promise<Record<string, string>> {
  if (USE_REDIS) {
    const arr = await redis<string[]>(['HGETALL', key]);
    const result: Record<string, string> = {};
    for (let i = 0; i < arr.length; i += 2) {
      result[arr[i]] = arr[i + 1];
    }
    return result;
  }
  const raw = mem.get(key);
  return raw ? JSON.parse(raw) : {};
}

export async function kvExpire(key: string, seconds: number): Promise<void> {
  if (USE_REDIS) {
    await redis(['EXPIRE', key, String(seconds)]);
    return;
  }
  // In-memory: ignore TTL (acceptable for dev)
}

export function isRedisConfigured(): boolean {
  return USE_REDIS;
}
