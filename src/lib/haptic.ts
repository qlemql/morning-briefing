'use client';

/**
 * Haptic feedback utility for mobile devices.
 * Uses the Vibration API where available (Android Chrome, etc.)
 * Silently no-ops on unsupported platforms (iOS Safari, desktop).
 */
export function hapticLight(): void {
  try {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(10);
    }
  } catch {
    // silently ignore — haptics are optional
  }
}

export function hapticMedium(): void {
  try {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(25);
    }
  } catch {
    // silently ignore
  }
}
