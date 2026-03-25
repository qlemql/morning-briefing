'use client';

import { useState, useEffect, useCallback, startTransition } from 'react';
import { ThemeMode, getStoredTheme, setStoredTheme, applyTheme, resolveTheme } from '@/lib/theme';
import { hapticLight } from '@/lib/haptic';

const ICONS: Record<string, string> = {
  light: '☀️',
  dark: '🌙',
  system: '💻',
};

export default function ThemeToggle() {
  const [mode, setMode] = useState<ThemeMode>('system');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    startTransition(() => {
      setMode(getStoredTheme());
      setMounted(true);
    });
  }, []);

  // Listen for system preference changes when in system mode
  useEffect(() => {
    if (mode !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => applyTheme('system');
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [mode]);

  const cycle = useCallback(() => {
    hapticLight();
    const order: ThemeMode[] = ['system', 'light', 'dark'];
    const next = order[(order.indexOf(mode) + 1) % order.length];
    setMode(next);
    setStoredTheme(next);
    applyTheme(next);
  }, [mode]);

  // Don't render until mounted to avoid hydration mismatch
  if (!mounted) {
    return (
      <button className="w-8 h-8 rounded-lg flex items-center justify-center" aria-hidden="true">
        <span className="text-sm opacity-0">💻</span>
      </button>
    );
  }

  const resolved = resolveTheme(mode);
  const label = mode === 'system'
    ? `시스템 설정 (${resolved === 'dark' ? '다크' : '라이트'})`
    : mode === 'dark' ? '다크 모드' : '라이트 모드';

  return (
    <button
      onClick={cycle}
      className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors active:scale-90"
      aria-label={`테마 변경 (현재: ${label})`}
      title={label}
    >
      <span className="text-sm">{ICONS[mode]}</span>
    </button>
  );
}
