'use client';

import { useState, useEffect, startTransition } from 'react';

const STREAK_KEY = 'mb_streak';
const LAST_VISIT_KEY = 'mb_last_visit';

function getTodayKST(): string {
  return new Date(Date.now() + 9 * 3600 * 1000).toISOString().split('T')[0];
}

function getYesterdayKST(): string {
  return new Date(Date.now() + 9 * 3600 * 1000 - 86400000).toISOString().split('T')[0];
}

export default function StreakBadge() {
  const [streak, setStreak] = useState(0);
  const [showBadge, setShowBadge] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const today = getTodayKST();
    const lastVisit = localStorage.getItem(LAST_VISIT_KEY);
    let currentStreak = parseInt(localStorage.getItem(STREAK_KEY) || '0', 10);

    if (lastVisit === today) {
      // Already visited today
      startTransition(() => {
        setStreak(currentStreak);
        if (currentStreak >= 3) setShowBadge(true);
      });
      return;
    }

    if (lastVisit === getYesterdayKST()) {
      // Consecutive day!
      currentStreak += 1;
    } else {
      // Streak broken or first visit
      currentStreak = 1;
    }

    localStorage.setItem(STREAK_KEY, String(currentStreak));
    localStorage.setItem(LAST_VISIT_KEY, today);
    startTransition(() => setStreak(currentStreak));

    // Show badge animation for streaks >= 3
    if (currentStreak >= 3) {
      setTimeout(() => startTransition(() => setShowBadge(true)), 2000);
    }
  }, []);

  if (!showBadge || streak < 3) return null;

  return (
    <span
      className="inline-flex items-center gap-1 bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-xs font-semibold px-2 py-0.5 rounded-full animate-fade-slide-up"
      title={`${streak}일 연속 방문 중!`}
    >
      🔥 {streak}일째
    </span>
  );
}
