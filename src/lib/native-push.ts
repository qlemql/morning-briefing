'use client';

/**
 * Native Push Notification helpers for Capacitor (iOS/Android).
 * Uses @capacitor/push-notifications for APNs token registration.
 * Falls back gracefully on web — all exports are safe to call in any environment.
 */

import { Capacitor } from '@capacitor/core';

/** True when running inside a native Capacitor shell (iOS/Android) */
export function isNativePlatform(): boolean {
  return Capacitor.isNativePlatform();
}

/**
 * Request push permission and register for APNs/FCM.
 * Returns the device token string on success, empty string on error, null on web.
 */
export async function registerNativePush(): Promise<string | null> {
  if (!isNativePlatform()) return null;

  // Dynamic import — the plugin is only loaded on native
  const { PushNotifications } = await import('@capacitor/push-notifications');

  const permission = await PushNotifications.requestPermissions();
  if (permission.receive !== 'granted') return null;

  await PushNotifications.register();

  return new Promise<string>((resolve) => {
    PushNotifications.addListener('registration', (token) => {
      resolve(token.value);
    });
    PushNotifications.addListener('registrationError', () => {
      resolve('');
    });
  });
}

/**
 * Add a listener for foreground push notifications (native only).
 * Returns a cleanup function, or null on web.
 */
export async function addNativePushListeners(callbacks: {
  onReceived?: (notification: { title?: string; body?: string; data?: Record<string, unknown> }) => void;
  onActionPerformed?: (notification: { actionId: string; data?: Record<string, unknown> }) => void;
}): Promise<(() => void) | null> {
  if (!isNativePlatform()) return null;

  const { PushNotifications } = await import('@capacitor/push-notifications');

  const handles: Array<{ remove: () => Promise<void> }> = [];

  if (callbacks.onReceived) {
    const h = await PushNotifications.addListener(
      'pushNotificationReceived',
      (notification) => {
        callbacks.onReceived?.({
          title: notification.title ?? undefined,
          body: notification.body ?? undefined,
          data: notification.data as Record<string, unknown> | undefined,
        });
      },
    );
    handles.push(h);
  }

  if (callbacks.onActionPerformed) {
    const h = await PushNotifications.addListener(
      'pushNotificationActionPerformed',
      (action) => {
        callbacks.onActionPerformed?.({
          actionId: action.actionId,
          data: action.notification.data as Record<string, unknown> | undefined,
        });
      },
    );
    handles.push(h);
  }

  return () => {
    handles.forEach((h) => h.remove());
  };
}
