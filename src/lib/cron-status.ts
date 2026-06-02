/**
 * Cron 실행 결과 기록 — 어드민 대시보드에서 "오늘 생성 성공/실패"를 볼 수 있게
 * Redis에 마지막 실행 상태를 남긴다.
 *
 * Key schema:
 *   mb:cron:status:{date}   → 해당 날짜의 마지막 실행 결과 (14일 TTL)
 *   mb:cron:status:last     → 가장 최근 실행 결과 (날짜 무관)
 */

import { kvGet, kvSet } from './kv';

export type CronSource = 'cron' | 'manual' | 'watchdog';

export interface CronStatus {
  date: string;
  ok: boolean;
  results: Record<string, string>;
  source: CronSource;
  ranAt: string; // ISO timestamp
  recovered?: boolean; // 워치독이 1차 누락을 메꿔 재생성한 경우
}

const TTL = 14 * 86400; // 14 days

function statusKey(date: string): string {
  return `mb:cron:status:${date}`;
}

export async function setCronStatus(status: CronStatus): Promise<void> {
  try {
    const json = JSON.stringify(status);
    await kvSet(statusKey(status.date), json, TTL);
    await kvSet('mb:cron:status:last', json, TTL);
  } catch (err) {
    // 상태 기록 실패가 cron 본 작업을 깨뜨리면 안 됨
    console.warn('[CronStatus] failed to persist status:', err);
  }
}

export async function getCronStatus(date: string): Promise<CronStatus | null> {
  try {
    const raw = await kvGet(statusKey(date));
    return raw ? (JSON.parse(raw) as CronStatus) : null;
  } catch (err) {
    console.warn('[CronStatus] failed to read status:', err);
    return null;
  }
}
