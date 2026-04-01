'use client';

import { useState, useEffect, useCallback } from 'react';
import { track } from '@/lib/track';

const STORAGE_KEY = 'mb_install_dismissed';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function InstallPrompt() {
  const [visible, setVisible] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    // 이미 설치됐거나 닫았으면 표시 안 함
    if (localStorage.getItem(STORAGE_KEY)) return;
    if (window.matchMedia('(display-mode: standalone)').matches) return;
    // 네이티브 앱 안에서도 표시 안 함
    if ((window as unknown as { __NATIVE_APP__?: boolean }).__NATIVE_APP__) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      // 5초 후에 표시 (즉시 표시하면 사용자 경험 방해)
      setTimeout(() => setVisible(true), 5000);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = useCallback(async () => {
    if (!deferredPrompt) return;
    track('pwa_install_click');
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      track('pwa_installed');
    }
    setVisible(false);
    localStorage.setItem(STORAGE_KEY, 'true');
    setDeferredPrompt(null);
  }, [deferredPrompt]);

  const handleDismiss = useCallback(() => {
    setVisible(false);
    localStorage.setItem(STORAGE_KEY, 'true');
    track('pwa_install_dismiss');
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed left-4 right-4 z-40 mx-auto max-w-lg animate-slide-up ios-safe-fixed-bottom" style={{ bottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
      <div className="bg-white dark:bg-[#1c1c1e] rounded-2xl shadow-lg border border-gray-100 dark:border-gray-800 p-4 flex items-start gap-3">
        <div className="flex-shrink-0 w-10 h-10 bg-gray-900 dark:bg-gray-700 rounded-xl flex items-center justify-center text-lg">
          📱
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            홈 화면에 추가하기
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            앱처럼 빠르게 열 수 있어요
          </p>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <button
            onClick={handleDismiss}
            className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1"
          >
            나중에
          </button>
          <button
            onClick={handleInstall}
            className="text-xs font-semibold text-white bg-gray-900 px-3 py-1.5 rounded-lg hover:bg-gray-800 active:scale-95 transition-all"
          >
            설치
          </button>
        </div>
      </div>
    </div>
  );
}
