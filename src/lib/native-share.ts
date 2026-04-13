'use client';

/**
 * Native share sheet using @capacitor/share.
 * Falls back to Web Share API or clipboard on web.
 */

import { Capacitor } from '@capacitor/core';

interface ShareOptions {
  title: string;
  text: string;
  url: string;
}

/**
 * Share content using native share sheet (iOS/Android) or Web Share API.
 * Returns true if shared successfully, false otherwise.
 */
export async function nativeShare(options: ShareOptions): Promise<boolean> {
  // Native: use Capacitor Share plugin
  if (Capacitor.isNativePlatform()) {
    try {
      const { Share } = await import('@capacitor/share');
      await Share.share({
        title: options.title,
        text: options.text,
        url: options.url,
        dialogTitle: options.title,
      });
      return true;
    } catch {
      // User cancelled or plugin error — fall through to web
    }
  }

  // Web: try navigator.share first
  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      await navigator.share({
        title: options.title,
        text: options.text,
        url: options.url,
      });
      return true;
    } catch {
      // User cancelled — fall through to clipboard
    }
  }

  // Final fallback: clipboard
  if (typeof navigator !== 'undefined' && navigator.clipboard) {
    const fullText = `${options.text}\n\n${options.url}`;
    await navigator.clipboard.writeText(fullText);
    return true;
  }

  return false;
}
