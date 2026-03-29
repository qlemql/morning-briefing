'use client';

import { useState, useEffect, startTransition } from 'react';
import { CacheUtils } from '@/lib/cache';

/**
 * Shows a banner for users in trial period:
 * - First visit: "7일간 모든 브리핑을 무료로 보세요!"
 * - During trial: "무료 체험 D-{N} | 프리미엄 런칭 기념"
 * - Last day: urgent banner
 */
export default function TrialBanner() {
  const [show, setShow] = useState(false);
  const [message, setMessage] = useState('');
  const [isUrgent, setIsUrgent] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const dismissed = sessionStorage.getItem('mb_trial_banner_dismissed');
    if (dismissed) return;

    const inTrial = CacheUtils.isInTrialPeriod();
    const days = CacheUtils.getTrialDaysRemaining();
    const subscribed = CacheUtils.isSubscribed();

    if (subscribed || !inTrial) return;

    if (days === 7) {
      // First visit
      startTransition(() => {
        setMessage('프리미엄 런칭 기념 — 7일간 모든 브리핑을 무료로 보세요!');
        setShow(true);
      });
    } else if (days <= 2 && days > 0) {
      startTransition(() => {
        setMessage(`무료 체험이 ${days}일 남았어요! 놓치지 마세요`);
        setIsUrgent(true);
        setShow(true);
      });
    } else if (days > 0) {
      startTransition(() => {
        setMessage(`프리미엄 무료 체험 D-${days}`);
        setShow(true);
      });
    }
  }, []);

  if (!show) return null;

  return (
    <div className="mx-auto max-w-lg px-4 pt-3">
      <div className={`rounded-xl px-4 py-2.5 text-sm flex items-center gap-2 ${
        isUrgent
          ? 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400'
          : 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400'
      }`}>
        <span>{isUrgent ? '⏰' : '🎁'}</span>
        <span className="flex-1 font-medium">{message}</span>
        <button
          onClick={() => {
            setShow(false);
            sessionStorage.setItem('mb_trial_banner_dismissed', '1');
          }}
          className="text-current opacity-40 hover:opacity-70 text-xs ml-1 p-2 -m-2"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
