'use client';

const THEME_KEY = 'mb_theme';

export type ThemeMode = 'light' | 'dark' | 'system';

/** Get stored theme preference */
export function getStoredTheme(): ThemeMode {
  if (typeof window === 'undefined') return 'system';
  return (localStorage.getItem(THEME_KEY) as ThemeMode) || 'system';
}

/** Save theme preference */
export function setStoredTheme(mode: ThemeMode) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(THEME_KEY, mode);
}

/** Resolve effective theme (light or dark) from mode */
export function resolveTheme(mode: ThemeMode): 'light' | 'dark' {
  if (mode === 'system') {
    if (typeof window === 'undefined') return 'light';
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return mode;
}

/** Apply theme to document */
export function applyTheme(mode: ThemeMode) {
  const resolved = resolveTheme(mode);
  document.documentElement.classList.toggle('dark', resolved === 'dark');
  // Update meta theme-color
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) {
    meta.setAttribute('content', resolved === 'dark' ? '#111111' : '#1d1d1f');
  }
}

/** Initialize theme on page load (call from layout script) */
export function initThemeScript(): string {
  // This returns an inline script string to prevent FOUC (flash of unstyled content)
  return `
    (function() {
      try {
        var t = localStorage.getItem('${THEME_KEY}') || 'system';
        var d = t === 'system'
          ? window.matchMedia('(prefers-color-scheme: dark)').matches
          : t === 'dark';
        if (d) document.documentElement.classList.add('dark');
        var m = document.querySelector('meta[name="theme-color"]');
        if (m) m.setAttribute('content', d ? '#111111' : '#1d1d1f');
      } catch(e) {}
    })();
  `;
}
