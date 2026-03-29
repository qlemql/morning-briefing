/**
 * Server-side in-memory cache for briefing data
 *
 * 핵심 전략: 카테고리당 하루 1번만 Claude API 호출.
 * 이후 모든 유저 요청은 이 캐시에서 서빙.
 *
 * Vercel Serverless 환경에서는 함수 인스턴스가 재활용되는 동안 유효.
 * 콜드 스타트 시에만 새로 생성.
 */

import { BriefingCategory } from './types';
import { kvGet, kvSet, isRedisConfigured } from './kv';
import { getEvergreenBriefing } from '@/data/evergreen';

interface CacheEntry {
  data: BriefingCategory;
  date: string;
  cachedAt: number;
}

// In-memory cache: category -> CacheEntry
const cache = new Map<string, CacheEntry>();

// 카테고리별 진행 중인 생성 요청 (중복 호출 방지)
const pendingRequests = new Map<string, Promise<BriefingCategory>>();

export const ServerCache = {
  /**
   * 캐시에서 브리핑 가져오기
   * 오늘 날짜의 데이터만 유효
   */
  get(category: string, date: string): BriefingCategory | null {
    const entry = cache.get(category);
    if (!entry) return null;
    if (entry.date !== date) return null; // 날짜 불일치 → 무효

    return entry.data;
  },

  /**
   * 캐시에 브리핑 저장
   */
  set(category: string, date: string, data: BriefingCategory): void {
    cache.set(category, {
      data,
      date,
      cachedAt: Date.now(),
    });
  },

  /**
   * 동시 요청 중복 방지 (request deduplication)
   * 같은 카테고리+날짜에 대한 여러 요청이 동시에 들어오면
   * 첫 번째 요청만 API를 호출하고, 나머지는 그 결과를 공유
   */
  async getOrGenerate(
    category: string,
    date: string,
    generator: () => Promise<BriefingCategory>,
  ): Promise<BriefingCategory> {
    // 1. In-memory 캐시 확인
    const cached = this.get(category, date);
    if (cached) return cached;

    // 2. Redis 캐시 확인 (cold start 시에도 재생성 방지)
    if (isRedisConfigured()) {
      try {
        const redisKey = `mb:briefing:${category}:${date}`;
        const redisData = await kvGet(redisKey);
        if (redisData) {
          const parsed = JSON.parse(redisData) as BriefingCategory;
          this.set(category, date, parsed); // in-memory에도 캐싱
          console.log(`[Cache] ${category} ${date} — Redis hit`);
          return parsed;
        }
      } catch (err) {
        console.warn('[Cache] Redis read failed:', err);
      }
    }

    // 3. 진행 중인 요청 확인
    const key = `${category}_${date}`;
    const pending = pendingRequests.get(key);
    if (pending) return pending;

    // 4. 새 요청 시작
    const promise = generator()
      .then(async (result) => {
        this.set(category, date, result);
        pendingRequests.delete(key);

        // Redis에도 저장 (24시간 TTL)
        if (isRedisConfigured()) {
          try {
            const redisKey = `mb:briefing:${category}:${date}`;
            await kvSet(redisKey, JSON.stringify(result), 86400);
          } catch {
            // Redis 저장 실패해도 in-memory 캐시는 유지
          }
        }

        return result;
      })
      .catch((error) => {
        pendingRequests.delete(key);

        // Evergreen fallback: API 장애 시 상시 콘텐츠 반환
        const fallback = getEvergreenBriefing(category, date);
        if (fallback) {
          console.warn(`[Cache] ${category} ${date} — generator failed, using evergreen fallback`);
          return fallback;
        }

        throw error;
      });

    pendingRequests.set(key, promise);
    return promise;
  },

  /**
   * 캐시 조회 전용 (API 생성 없음)
   * In-memory → Redis → evergreen fallback 순으로 조회
   * POST 엔드포인트에서 사용 — 절대 Claude API를 호출하지 않음
   */
  async getOnly(
    category: string,
    date: string,
  ): Promise<BriefingCategory> {
    // 1. In-memory 캐시 확인
    const cached = this.get(category, date);
    if (cached) return cached;

    // 2. Redis 캐시 확인
    if (isRedisConfigured()) {
      try {
        const redisKey = `mb:briefing:${category}:${date}`;
        const redisData = await kvGet(redisKey);
        if (redisData) {
          const parsed = JSON.parse(redisData) as BriefingCategory;
          this.set(category, date, parsed); // in-memory에도 캐싱
          console.log(`[Cache] ${category} ${date} — Redis hit (getOnly)`);
          return parsed;
        }
      } catch (err) {
        console.warn('[Cache] Redis read failed (getOnly):', err);
      }
    }

    // 3. 캐시 미스 — evergreen fallback 반환 (API 호출 없음)
    console.warn(`[Cache] ${category} ${date} — cache miss, returning evergreen fallback`);
    const fallback = getEvergreenBriefing(category, date);
    if (fallback) return fallback;

    // evergreen도 없는 경우 (있을 수 없지만 안전장치)
    throw new Error(`No cached briefing and no evergreen fallback for ${category}`);
  },

  /**
   * 캐시 상태 조회 (디버깅용)
   */
  getStats() {
    const entries: Record<string, { date: string; cachedAt: string }> = {};
    for (const [key, entry] of cache) {
      entries[key] = {
        date: entry.date,
        cachedAt: new Date(entry.cachedAt).toISOString(),
      };
    }
    return {
      size: cache.size,
      entries,
      pendingRequests: pendingRequests.size,
    };
  },
};
