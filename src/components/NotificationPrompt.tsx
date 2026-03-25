'use client';

import { useState, useEffect, useCallback } from 'react';
import { track } from '@/lib/track';

const STORAGE_KEY = 'mb_notif_dismissed';
const SHOW_AFTER_VISITS = 2; // Show after 2 page views

export default function NotificationPrompt() {
  const [visible, setVisible] = useState(false);
  const [subscribed, setSubscribed] = useState(false);

  useEffect(() => {
    // Don't show if already dismissed, subscribed, or in native app
    if (typeof window === 'undefined') return;
    if (localStorage.getItem(STORAGE_KEY)) return;
    if ((window as unknown as { __NATIVE_APP__?: boolean }).__NATIVE_APP__) return;

    // Check if already subscribed
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      navigator.serviceWorker.ready.then((reg) => {
        reg.pushManager.getSubscription().then((sub) => {
          if (sub) {
            setSubscribed(true);
            return;
          }
        });
      });
    }

    // Show after a few visits
    const visits = parseInt(localStorage.getItem('mb_visit_count') || '0', 10) + 1;
    localStorage.setItem('mb_visit_count', String(visits));
    if (visits >= SHOW_AFTER_VISITS) {
      const timer = setTimeout(() => setVisible(true), 3000); // 3s delay
      return () => clearTimeout(timer);
    }
  }, []);

  const handleDismiss = useCallback(() => {
    setVisible(false);
    localStorage.setItem(STORAGE_KEY, 'true');
    track('notif_dismiss');
  }, []);

  const handleSubscribe = useCallback(async () => {
    track('notif_subscribe_click');

    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      // Fallback: just save a flag that user is interested
      localStorage.setItem('mb_wants_notif', 'true');
      setSubscribed(true);
      setVisible(false);
      localStorage.setItem(STORAGE_KEY, 'true');
      return;
    }

    try {
      const reg = await navigator.serviceWorker.ready;
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        // For now, just get the subscription - we'll add server-side storage later
        await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: undefined, // Will need VAPID key for production
        });
        setSubscribed(true);
        track('notif_subscribed');
      }
    } catch {
      // Permission denied or error — save interest flag anyway
      localStorage.setItem('mb_wants_notif', 'true');
    }

    setVisible(false);
    localStorage.setItem(STORAGE_KEY, 'true');
  }, []);

  if (!visible || subscribed) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-40 mx-auto max-w-lg animate-slide-up">
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-4 flex items-start gap-3">
        <div className="flex-shrink-0 w-10 h-10 bg-sky-50 rounded-xl flex items-center justify-center text-lg">
          🔔
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900">
            매일 아침 브리핑 알림 받기
          </p>
          <p className="text-xs text-gray-500 mt-0.5">
            매일 오전 7시, 오늘의 브리핑을 놓치지 마세요
          </p>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <button
            onClick={handleDismiss}
            className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1"
          >
            괜찮아요
          </button>
          <button
            onClick={handleSubscribe}
            className="text-xs font-semibold text-white bg-gray-900 px-3 py-1.5 rounded-lg hover:bg-gray-800 active:scale-95 transition-all"
          >
            알림 받기
          </button>
        </div>
      </div>
    </div>
  );
}
