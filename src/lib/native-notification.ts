'use client';

import { Capacitor } from '@capacitor/core';

/**
 * 로컬 알림 — 매일 아침 사용자 지정 시간에 브리핑 알림 발송
 * iOS Push 인프라(APNs) 셋업 전 단계의 MVP. 콘텐츠는 정적이고 탭하면 앱 진입.
 */

const NOTIFICATION_ID = 1; // 단일 daily notification (덮어쓰기)
export const NOTIFICATION_TIME_KEY = 'mb_notif_time'; // "HH:MM" 형식
export const NOTIFICATION_ENABLED_KEY = 'mb_notif_enabled'; // "1" | "0"

/** 권한 요청 + 현재 상태 반환 */
export async function requestPermission(): Promise<'granted' | 'denied' | 'unsupported'> {
  if (!Capacitor.isNativePlatform()) {
    // 웹 폴백 — Notification API
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return 'unsupported';
    }
    if (Notification.permission === 'granted') return 'granted';
    if (Notification.permission === 'denied') return 'denied';
    const result = await Notification.requestPermission();
    return result === 'granted' ? 'granted' : 'denied';
  }

  try {
    const { LocalNotifications } = await import('@capacitor/local-notifications');
    const status = await LocalNotifications.checkPermissions();
    if (status.display === 'granted') return 'granted';
    if (status.display === 'denied') return 'denied';
    const req = await LocalNotifications.requestPermissions();
    return req.display === 'granted' ? 'granted' : 'denied';
  } catch {
    return 'unsupported';
  }
}

/** 매일 반복 알림 예약. 기존 알림은 자동 덮어쓰기. */
export async function scheduleDaily(hour: number, minute: number): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) {
    // 웹은 로컬 daily schedule 못 함 (서비스 워커도 정확한 시간 보장 안 됨)
    return false;
  }
  try {
    const { LocalNotifications } = await import('@capacitor/local-notifications');

    // 기존 알림 취소
    await LocalNotifications.cancel({ notifications: [{ id: NOTIFICATION_ID }] });

    // schedule.on: 캘린더 trigger 기반 — iOS UNCalendarNotificationTrigger 사용
    // hour/minute는 디바이스 로컬 시간으로 매칭되며 매일 자동 반복.
    // (기존 at + repeats + every: 'day' 조합은 timezone 오프셋 버그 있음)
    await LocalNotifications.schedule({
      notifications: [
        {
          id: NOTIFICATION_ID,
          title: '☀️ 오늘의 아침 브리핑이 도착했어요',
          body: '3분 안에 오늘 꼭 알아야 할 경제·투자·생활 뉴스를 확인하세요',
          schedule: {
            on: { hour, minute },
            allowWhileIdle: true,
          },
          sound: undefined, // 시스템 기본음
          extra: { source: 'daily_briefing' },
        },
      ],
    });
    return true;
  } catch (e) {
    console.error('[notification] schedule failed', e);
    return false;
  }
}

/** 예약된 알림 취소 */
export async function cancelDaily(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try {
    const { LocalNotifications } = await import('@capacitor/local-notifications');
    await LocalNotifications.cancel({ notifications: [{ id: NOTIFICATION_ID }] });
  } catch {
    // ignore
  }
}

/** localStorage 헬퍼 */
export function getSavedTime(): { hour: number; minute: number } | null {
  if (typeof window === 'undefined') return null;
  try {
    const v = localStorage.getItem(NOTIFICATION_TIME_KEY);
    if (!v) return null;
    const [h, m] = v.split(':').map((s) => parseInt(s, 10));
    // 손상된 localStorage 값 방어: 범위 밖이면 null
    if (Number.isNaN(h) || Number.isNaN(m)) return null;
    if (h < 0 || h > 23 || m < 0 || m > 59) return null;
    return { hour: h, minute: m };
  } catch {
    return null;
  }
}

export function setSavedTime(hour: number, minute: number): void {
  if (typeof window === 'undefined') return;
  try {
    const hh = String(hour).padStart(2, '0');
    const mm = String(minute).padStart(2, '0');
    localStorage.setItem(NOTIFICATION_TIME_KEY, `${hh}:${mm}`);
  } catch {
    // ignore
  }
}

export function getEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem(NOTIFICATION_ENABLED_KEY) === '1';
  } catch {
    return false;
  }
}

export function setEnabled(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(NOTIFICATION_ENABLED_KEY, enabled ? '1' : '0');
  } catch {
    // ignore
  }
}
