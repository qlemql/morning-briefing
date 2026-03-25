'use client';

import { useState, useEffect, useCallback } from 'react';
import { track } from '@/lib/track';

const STORAGE_KEY = 'mb_email_collected';
const SHOW_AFTER_VISITS = 3;

export default function EmailCollector() {
  const [visible, setVisible] = useState(false);
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (localStorage.getItem(STORAGE_KEY)) return;

    const visits = parseInt(localStorage.getItem('mb_visit_count') || '0', 10);
    if (visits >= SHOW_AFTER_VISITS) {
      // Show after 8 seconds (after notification prompt would have shown)
      const timer = setTimeout(() => setVisible(true), 8000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleSubmit = useCallback(async () => {
    const trimmed = email.trim();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError('올바른 이메일을 입력해주세요');
      return;
    }
    setError('');

    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmed }),
      });

      if (res.ok) {
        track('email_subscribed');
        setSubmitted(true);
        localStorage.setItem(STORAGE_KEY, 'true');
        setTimeout(() => setVisible(false), 3000);
      } else {
        setError('잠시 후 다시 시도해주세요');
      }
    } catch {
      setError('네트워크 오류가 발생했습니다');
    }
  }, [email]);

  const handleDismiss = useCallback(() => {
    setVisible(false);
    localStorage.setItem(STORAGE_KEY, 'dismissed');
    track('email_dismiss');
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 pointer-events-none">
      <div className="w-full max-w-lg pointer-events-auto animate-slide-up">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-gray-900 to-gray-800 px-5 py-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white font-bold text-sm">매일 아침 브리핑을 이메일로 받아보세요</p>
                <p className="text-white/60 text-xs mt-0.5">무료 뉴스레터 구독</p>
              </div>
              <button
                onClick={handleDismiss}
                className="text-white/40 hover:text-white/70 text-lg leading-none"
                aria-label="닫기"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="p-5">
            {submitted ? (
              <div className="text-center py-2">
                <div className="text-2xl mb-2">🎉</div>
                <p className="text-sm font-semibold text-gray-900">구독 완료!</p>
                <p className="text-xs text-gray-500 mt-1">내일 아침부터 브리핑을 보내드릴게요</p>
              </div>
            ) : (
              <>
                <div className="flex gap-2">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setError(''); }}
                    onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                    placeholder="이메일 주소 입력"
                    className="flex-1 px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/20 focus:border-gray-400 transition-all"
                    autoComplete="email"
                  />
                  <button
                    onClick={handleSubmit}
                    className="px-5 py-3 bg-gray-900 text-white rounded-xl font-semibold text-sm hover:bg-gray-800 active:scale-95 transition-all flex-shrink-0"
                  >
                    구독
                  </button>
                </div>
                {error && (
                  <p className="text-xs text-red-500 mt-2 ml-1">{error}</p>
                )}
                <p className="text-xs text-gray-400 mt-3 ml-1">
                  스팸 없이, 매일 아침 1통. 언제든 구독 취소 가능
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
