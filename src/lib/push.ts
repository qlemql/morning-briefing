'use client';

/**
 * Client-side Web Push subscription helpers.
 * Uses the Push API with VAPID for browser push notifications.
 */

function getVapidPublicKey(): string | null {
  return typeof window !== 'undefined'
    ? (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? null)
    : null;
}

/**
 * Convert a URL-safe base64 VAPID key to a Uint8Array for PushManager.subscribe()
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/** Check if the browser supports push notifications */
export function isPushSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

/** Check if the user is already subscribed */
export async function isPushSubscribed(): Promise<boolean> {
  if (!isPushSupported()) return false;
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    return !!sub;
  } catch {
    return false;
  }
}

/** Subscribe to push notifications. Returns true on success. */
export async function subscribeToPush(): Promise<boolean> {
  if (!isPushSupported()) return false;

  const vapidKey = getVapidPublicKey();
  if (!vapidKey) {
    console.warn('[Push] VAPID public key not configured');
    return false;
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return false;

    const reg = await navigator.serviceWorker.ready;
    const subscription = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidKey) as BufferSource,
    });

    // Send subscription to server
    const res = await fetch('/api/push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(subscription.toJSON()),
    });

    return res.ok;
  } catch (err) {
    console.error('[Push] Subscribe failed:', err);
    return false;
  }
}

/** Unsubscribe from push notifications. Returns true on success. */
export async function unsubscribeFromPush(): Promise<boolean> {
  if (!isPushSupported()) return false;

  try {
    const reg = await navigator.serviceWorker.ready;
    const subscription = await reg.pushManager.getSubscription();
    if (!subscription) return true; // Already unsubscribed

    // Notify server first
    await fetch('/api/push', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ endpoint: subscription.endpoint }),
    });

    // Unsubscribe locally
    await subscription.unsubscribe();
    return true;
  } catch (err) {
    console.error('[Push] Unsubscribe failed:', err);
    return false;
  }
}
