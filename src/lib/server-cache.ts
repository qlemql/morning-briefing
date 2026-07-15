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
import { kvGet, kvSet, kvSadd, kvSmembers, isRedisConfigured } from './kv';
import { getEvergreenBriefing } from '@/data/evergreen';

// SEO/장기 archive 보관 기간: 365일
const ARCHIVE_TTL_SECONDS = 365 * 24 * 60 * 60;

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
    opts: { force?: boolean } = {},
  ): Promise<BriefingCategory> {
    // force=true면 기존 캐시를 무시하고 무조건 재생성(성공 시 아래에서 Redis에 덮어씀).
    // 1. In-memory 캐시 확인
    const cached = opts.force ? null : this.get(category, date);
    if (cached) return cached;

    // 2. Redis 캐시 확인 (cold start 시에도 재생성 방지)
    if (!opts.force && isRedisConfigured()) {
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

        // Redis 저장: 단기 캐시(24h) + 장기 archive(365d) + 카테고리별 인덱스
        if (isRedisConfigured()) {
          try {
            const briefingKey = `mb:briefing:${category}:${date}`;
            await kvSet(briefingKey, JSON.stringify(result), 86400);

            // SEO용 장기 archive (365일 보관)
            const archiveKey = `mb:archive:${category}:${date}`;
            await kvSet(archiveKey, JSON.stringify(result), ARCHIVE_TTL_SECONDS);

            // 카테고리별 archive 날짜 인덱스 (목록 페이지용)
            await kvSadd(`mb:archive_dates:${category}`, date);
          } catch (writeErr) {
            // in-memory 캐시는 유지하되, 무증상 장애를 막기 위해 반드시 로깅한다.
            // 이 쓰기가 실패하면 데이터가 현재 람다 메모리에만 남아, 다른 인스턴스
            // (읽기 엔드포인트)는 evergreen 폴백만 서빙하게 된다.
            console.error(
              `[Cache] Redis write FAILED for ${category} ${date} — data only in-memory:`,
              writeErr,
            );
          }
        }

        return result;
      })
      .catch((error) => {
        pendingRequests.delete(key);

        // 생성 실패를 호출자(cron)에게 그대로 전파한다.
        // 과거에는 여기서 evergreen 폴백을 반환했지만, 그러면 cron이
        // "생성 실패 → 폴백(3장)"을 "OK (3 cards)"로 오판하고 아무것도 저장하지 않아
        // 읽기 엔드포인트가 영구히 폴백만 서빙하는 무증상 장애가 발생했다.
        // 폴백 서빙은 읽기 경로(getOnly)가 책임진다.
        console.error(`[Cache] ${category} ${date} — generation failed, propagating to caller:`, error);
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
   * 오늘자 브리핑이 Redis에 이미 존재하는지만 확인 (생성/파싱 없음)
   * cron이 "방금 새로 생성했는가 vs 이미 있던 것인가"를 구분하는 데 사용 —
   * 워치독/수동 재실행 시 중복 push·SNS 방지.
   */
  async peekRedis(category: string, date: string): Promise<boolean> {
    if (!isRedisConfigured()) return false;
    try {
      const raw = await kvGet(`mb:briefing:${category}:${date}`);
      return !!raw;
    } catch {
      return false;
    }
  },

  /**
   * Archive 조회 — SEO용 장기 보관 데이터 (365일)
   * 단기 캐시에 없으면 archive 키 fallback. 정적 페이지(/archive/[date])용.
   */
  async getArchive(category: string, date: string): Promise<BriefingCategory | null> {
    if (!isRedisConfigured()) return null;
    try {
      const archiveKey = `mb:archive:${category}:${date}`;
      const raw = await kvGet(archiveKey);
      if (raw) return JSON.parse(raw) as BriefingCategory;
      // Fallback: 단기 캐시 키 (오늘 데이터의 경우 archive 저장 전일 수 있음)
      const briefingKey = `mb:briefing:${category}:${date}`;
      const briefingRaw = await kvGet(briefingKey);
      if (briefingRaw) return JSON.parse(briefingRaw) as BriefingCategory;
    } catch (err) {
      console.warn('[Cache] getArchive failed:', err);
    }
    return null;
  },

  /**
   * Archive 목록 조회 — 최신순
   * 결과: ['2026-04-27', '2026-04-26', ...] (최대 limit개)
   */
  async listArchiveDates(category: string, limit: number = 30): Promise<string[]> {
    if (!isRedisConfigured()) return [];
    try {
      const dates = await kvSmembers(`mb:archive_dates:${category}`);
      return dates.sort((a, b) => b.localeCompare(a)).slice(0, limit);
    } catch (err) {
      console.warn('[Cache] listArchiveDates failed:', err);
      return [];
    }
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
