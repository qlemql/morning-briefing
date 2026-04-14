'use client';

import { Capacitor } from '@capacitor/core';

/**
 * Haptic feedback utility.
 * Native: @capacitor/haptics (real haptic engine)
 * Web: navigator.vibrate() fallback
 */

async function nativeHaptic(style: 'Light' | 'Medium' | 'Heavy'): Promise<void> {
  try {
    const { Haptics, ImpactStyle } = await import('@capacitor/haptics');
    await Haptics.impact({ style: ImpactStyle[style] });
  } catch {
    // silently ignore
  }
}

export function hapticLight(): void {
  try {
    if (Capacitor.isNativePlatform()) {
      nativeHaptic('Light');
      return;
    }
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(10);
    }
  } catch {
    // silently ignore — haptics are optional
  }
}

export function hapticMedium(): void {
  try {
    if (Capacitor.isNativePlatform()) {
      nativeHaptic('Medium');
      return;
    }
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(25);
    }
  } catch {
    // silently ignore
  }
}
