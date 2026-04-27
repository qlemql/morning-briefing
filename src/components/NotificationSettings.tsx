'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  requestPermission,
  scheduleDaily,
  cancelDaily,
  getSavedTime,
  setSavedTime,
  getEnabled,
  setEnabled,
} from '@/lib/native-notification';
import { track } from '@/lib/track';
import { hapticLight, hapticMedium } from '@/lib/haptic';
import { showToast } from '@/components/Toast';

const HOURS = Array.from({ length: 12 }, (_, i) => i); // 0 = 12시
const MINUTES = [0, 10, 20, 30, 40, 50];

const BellIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M18 8a6 6 0 00-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 01-3.46 0" />
  </svg>
);

function to24Hour(meridiem: 'AM' | 'PM', hour12: number): number {
  // hour12: 0 means "12시"
  const h = hour12 === 0 ? 12 : hour12;
  if (meridiem === 'AM') return h === 12 ? 0 : h;
  return h === 12 ? 12 : h + 12;
}

function from24Hour(h24: number): { meridiem: 'AM' | 'PM'; hour12: number } {
  if (h24 === 0) return { meridiem: 'AM', hour12: 0 }; // 12 AM
  if (h24 < 12) return { meridiem: 'AM', hour12: h24 };
  if (h24 === 12) return { meridiem: 'PM', hour12: 0 }; // 12 PM
  return { meridiem: 'PM', hour12: h24 - 12 };
}

export default function NotificationSettings() {
  const [enabled, setEnabledState] = useState(false);
  const [meridiem, setMeridiem] = useState<'AM' | 'PM'>('AM');
  const [hour12, setHour12] = useState(7); // default 7 AM
  const [minute, setMinute] = useState(0);
  const [permission, setPermission] = useState<'granted' | 'denied' | 'unknown'>('unknown');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // 저장된 설정 복원
    setEnabledState(getEnabled());
    const saved = getSavedTime();
    if (saved) {
      const { meridiem: m, hour12: h } = from24Hour(saved.hour);
      setMeridiem(m);
      setHour12(h);
      setMinute(saved.minute);
    }
  }, []);

  const handleToggle = useCallback(async () => {
    hapticMedium();
    setBusy(true);
    try {
      if (!enabled) {
        // 권한 요청 + 스케줄
        const result = await requestPermission();
        if (result === 'denied') {
          setPermission('denied');
          showToast('알림 권한이 거부됐어요. 설정에서 켜주세요.', '🔕');
          setBusy(false);
          return;
        }
        if (result === 'unsupported') {
          showToast('이 환경에선 알림을 사용할 수 없어요.', '⚠️');
          setBusy(false);
          return;
        }
        setPermission('granted');
        const h24 = to24Hour(meridiem, hour12);
        const ok = await scheduleDaily(h24, minute);
        if (ok) {
          setEnabled(true);
          setSavedTime(h24, minute);
          setEnabledState(true);
          track('notification_enable', { hour: String(h24), minute: String(minute) });
          showToast(`매일 ${meridiem === 'AM' ? '오전' : '오후'} ${hour12 === 0 ? 12 : hour12}:${String(minute).padStart(2, '0')}에 알림 받아요`, '🔔');
        } else {
          showToast('알림 예약에 실패했어요. 다시 시도해주세요.', '⚠️');
        }
      } else {
        // 끄기
        await cancelDaily();
        setEnabled(false);
        setEnabledState(false);
        track('notification_disable');
        showToast('알림을 껐어요', '🔕');
      }
    } finally {
      setBusy(false);
    }
  }, [enabled, meridiem, hour12, minute]);

  const handleSaveTime = useCallback(async () => {
    if (!enabled) return; // 꺼져있으면 저장만 하고 스케줄 안 함
    hapticLight();
    setBusy(true);
    try {
      const h24 = to24Hour(meridiem, hour12);
      const ok = await scheduleDaily(h24, minute);
      if (ok) {
        setSavedTime(h24, minute);
        track('notification_time_change', { hour: String(h24), minute: String(minute) });
        showToast(`알림 시간 변경: ${meridiem === 'AM' ? '오전' : '오후'} ${hour12 === 0 ? 12 : hour12}:${String(minute).padStart(2, '0')}`, '✅');
      }
    } finally {
      setBusy(false);
    }
  }, [enabled, meridiem, hour12, minute]);

  // 시간 변경 시 자동 저장 (디바운스)
  useEffect(() => {
    if (!enabled) return;
    const t = setTimeout(() => {
      handleSaveTime();
    }, 600);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meridiem, hour12, minute]);

  return (
    <section className="rounded-2xl bg-white dark:bg-[#1c1c1e] border border-gray-100 dark:border-gray-800 p-5 mb-6">
      <div className="flex items-start gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center text-amber-600 dark:text-amber-400 flex-shrink-0">
          <BellIcon />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-[15px] font-bold text-gray-900 dark:text-gray-100 mb-0.5">
            매일 아침 알림
          </h3>
          <p className="text-[12px] text-gray-500 dark:text-gray-400 leading-relaxed">
            원하는 시간에 브리핑이 준비됐다는 알림을 받아보세요
          </p>
        </div>
        {/* Toggle */}
        <button
          onClick={handleToggle}
          disabled={busy}
          className={`relative inline-flex flex-shrink-0 w-12 h-7 rounded-full transition-colors ${
            enabled ? 'bg-amber-500' : 'bg-gray-200 dark:bg-gray-700'
          } ${busy ? 'opacity-50' : ''}`}
          aria-pressed={enabled}
          aria-label={enabled ? '알림 끄기' : '알림 켜기'}
        >
          <span
            className={`absolute top-0.5 left-0.5 w-6 h-6 rounded-full bg-white shadow-sm transition-transform ${
              enabled ? 'translate-x-5' : 'translate-x-0'
            }`}
            aria-hidden="true"
          />
        </button>
      </div>

      {/* Time picker */}
      <div className={`transition-opacity ${enabled ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
        <div className="flex items-stretch gap-2 rounded-xl bg-gray-50 dark:bg-gray-800/60 p-2">
          {/* AM/PM */}
          <div className="inline-flex rounded-lg bg-white dark:bg-gray-900 p-0.5">
            {(['AM', 'PM'] as const).map((m) => (
              <button
                key={m}
                onClick={() => { hapticLight(); setMeridiem(m); }}
                className={`px-3 py-1.5 text-[12px] font-bold rounded-md transition-all ${
                  meridiem === m
                    ? 'bg-amber-500 text-white shadow-sm'
                    : 'text-gray-500 dark:text-gray-400'
                }`}
              >
                {m === 'AM' ? '오전' : '오후'}
              </button>
            ))}
          </div>

          {/* Hour */}
          <select
            value={hour12}
            onChange={(e) => { hapticLight(); setHour12(parseInt(e.target.value, 10)); }}
            className="flex-1 rounded-lg bg-white dark:bg-gray-900 px-3 py-2 text-[14px] font-semibold text-gray-900 dark:text-gray-100 border-0 focus:outline-none focus:ring-2 focus:ring-amber-400"
            aria-label="시"
          >
            {HOURS.map((h) => (
              <option key={h} value={h}>{h === 0 ? 12 : h}시</option>
            ))}
          </select>

          {/* Minute */}
          <select
            value={minute}
            onChange={(e) => { hapticLight(); setMinute(parseInt(e.target.value, 10)); }}
            className="flex-1 rounded-lg bg-white dark:bg-gray-900 px-3 py-2 text-[14px] font-semibold text-gray-900 dark:text-gray-100 border-0 focus:outline-none focus:ring-2 focus:ring-amber-400"
            aria-label="분"
          >
            {MINUTES.map((m) => (
              <option key={m} value={m}>{String(m).padStart(2, '0')}분</option>
            ))}
          </select>
        </div>

        {permission === 'denied' && (
          <p className="mt-2 text-[11px] text-red-500 dark:text-red-400">
            알림 권한이 거부됐어요. iOS 설정 → 아침 브리핑 → 알림에서 허용해주세요.
          </p>
        )}
      </div>
    </section>
  );
}
