'use client';

/**
 * Native offline detection using @capacitor/network.
 * Falls back to navigator.onLine on web.
 */

import { Capacitor } from '@capacitor/core';

export interface NetworkStatus {
  connected: boolean;
  connectionType: string;
}

/**
 * Get the current network status.
 * Uses Capacitor Network plugin on native, navigator.onLine on web.
 */
export async function getNetworkStatus(): Promise<NetworkStatus> {
  if (Capacitor.isNativePlatform()) {
    const { Network } = await import('@capacitor/network');
    const status = await Network.getStatus();
    return {
      connected: status.connected,
      connectionType: status.connectionType,
    };
  }

  return {
    connected: typeof navigator !== 'undefined' ? navigator.onLine : true,
    connectionType: 'unknown',
  };
}

/**
 * Listen for network status changes.
 * Returns a cleanup function to remove the listener.
 */
export async function onNetworkChange(
  callback: (status: NetworkStatus) => void,
): Promise<() => void> {
  if (Capacitor.isNativePlatform()) {
    const { Network } = await import('@capacitor/network');
    const handle = await Network.addListener('networkStatusChange', (status) => {
      callback({
        connected: status.connected,
        connectionType: status.connectionType,
      });
    });
    return () => {
      handle.remove();
    };
  }

  // Web fallback: use online/offline events
  const handleOnline = () => callback({ connected: true, connectionType: 'unknown' });
  const handleOffline = () => callback({ connected: false, connectionType: 'unknown' });
  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
}
