'use client';

import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'mb_welcomed';

export default function WelcomeToast() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (localStorage.getItem(STORAGE_KEY)) return;

    // Show after 1.5s for first-time visitors
    const timer = setTimeout(() => setVisible(true), 1500);
    return () => clearTimeout(timer);
  }, []);

  const handleDismiss = useCallback(() => {
    setVisible(false);
    localStorage.setItem(STORAGE_KEY, 'true');
  }, []);

  // Auto-dismiss after 6 seconds
  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(() => {
      setVisible(false);
      localStorage.setItem(STORAGE_KEY, 'true');
    }, 6000);
    return () => clearTimeout(timer);
  }, [visible]);

  if (!visible) return null;

  return (
    <div className="fixed top-16 left-4 right-4 z-50 mx-auto max-w-lg animate-slide-up">
      <div className="bg-gray-900 rounded-2xl shadow-xl p-4 flex items-start gap-3">
        <div className="flex-shrink-0 text-2xl">👋</div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white">
            아침 브리핑에 오신 걸 환영합니다!
          </p>
          <p className="text-xs text-white/60 mt-0.5">
            AI가 매일 아침 뉴스를 3장 카드로 정리해요. 좌우 스와이프로 카테고리를 전환할 수 있어요.
          </p>
        </div>
        <button
          onClick={handleDismiss}
          className="text-white/40 hover:text-white/70 text-sm flex-shrink-0"
          aria-label="닫기"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
