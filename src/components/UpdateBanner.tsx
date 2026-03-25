'use client';

import { useState, useEffect } from 'react';
import { APP_VERSION } from '@/lib/version';

const CHANGELOG: Record<string, string> = {
  '1.2.0': '더 빠른 로딩, 공유 기능 개선, 당겨서 새로고침',
  '1.1.0': '풀-투-리프레시, 키보드 네비게이션, 웹 바이탈 모니터링',
};

const SEEN_KEY = 'mb_seen_version';

export default function UpdateBanner() {
  const [show, setShow] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const seen = localStorage.getItem(SEEN_KEY);
    if (!seen) {
      // First visit — just record version, no banner
      localStorage.setItem(SEEN_KEY, APP_VERSION);
      return;
    }
    if (seen !== APP_VERSION && CHANGELOG[APP_VERSION]) {
      setMessage(CHANGELOG[APP_VERSION]);
      setShow(true);
      localStorage.setItem(SEEN_KEY, APP_VERSION);
      // Auto-dismiss after 8s
      const t = setTimeout(() => setShow(false), 8000);
      return () => clearTimeout(t);
    }
  }, []);

  if (!show) return null;

  return (
    <div className="fixed top-14 left-1/2 -translate-x-1/2 z-50 animate-slide-up">
      <div className="bg-gray-900 text-white text-sm px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-2 max-w-sm">
        <span className="text-base">✨</span>
        <span className="flex-1">{message}</span>
        <button onClick={() => setShow(false)} className="text-white/40 hover:text-white/70 ml-1 text-xs">✕</button>
      </div>
    </div>
  );
}
