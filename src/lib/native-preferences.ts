'use client';

import { Capacitor } from '@capacitor/core';

/**
 * Key-value storage wrapper.
 * Native: @capacitor/preferences (persisted to device storage)
 * Web: localStorage fallback
 */

export async function getPreference(key: string): Promise<string | null> {
  if (Capacitor.isNativePlatform()) {
    try {
      const { Preferences } = await import('@capacitor/preferences');
      const { value } = await Preferences.get({ key });
      return value;
    } catch {
      return null;
    }
  }
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export async function setPreference(key: string, value: string): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    try {
      const { Preferences } = await import('@capacitor/preferences');
      await Preferences.set({ key, value });
      return;
    } catch {
      // fall through to localStorage
    }
  }
  try {
    localStorage.setItem(key, value);
  } catch {
    // storage full or disabled
  }
}

export async function removePreference(key: string): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    try {
      const { Preferences } = await import('@capacitor/preferences');
      await Preferences.remove({ key });
      return;
    } catch {
      // fall through to localStorage
    }
  }
  try {
    localStorage.removeItem(key);
  } catch {
    // ignore
  }
}
