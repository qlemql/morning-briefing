const CACHE_NAME = 'morning-briefing-v9';
const STATIC_ASSETS = [
  '/',
  '/privacy',
  '/manifest.json',
  '/offline.html',
];

// Install: pre-cache shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// Push: show notification when a push message arrives
self.addEventListener('push', (event) => {
  let data = { title: '아침 브리핑', body: '오늘의 경제 브리핑이 도착했어요', url: '/' };
  try {
    if (event.data) {
      data = Object.assign(data, event.data.json());
    }
  } catch {
    // Use defaults if payload parsing fails
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-72x72.png',
      tag: 'morning-briefing',
      renotify: true,
      data: { url: data.url },
    })
  );
});

// Notification click: open or focus the app
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Focus existing tab if open
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      // Otherwise open new tab
      return self.clients.openWindow(targetUrl);
    })
  );
});

// Fetch: network-first for API, stale-while-revalidate for pages
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET
  if (request.method !== 'GET') return;

  // Cache-first for CDN fonts (immutable assets)
  if (url.hostname === 'cdn.jsdelivr.net') {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        });
      })
    );
    return;
  }

  // Skip other cross-origin requests
  if (url.origin !== self.location.origin) return;

  // API calls: network-first with 8s timeout, stale cache fallback
  if (url.pathname.startsWith('/api/')) {
    // Skip caching for analytics/subscribe (write-only endpoints)
    if (url.pathname.includes('/analytics') || url.pathname.includes('/subscribe') || url.pathname.includes('/push')) return;

    event.respondWith(
      Promise.race([
        fetch(request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 8000)),
      ]).catch(() => caches.match(request))
    );
    return;
  }

  // Pages & static: stale-while-revalidate with offline fallback
  event.respondWith(
    caches.match(request).then((cached) => {
      const networkFetch = fetch(request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => {
          // Network failed and no cache → show offline page for navigation requests
          if (request.mode === 'navigate') {
            return caches.match('/offline.html');
          }
          return new Response('', { status: 503 });
        });
      return cached || networkFetch;
    })
  );
});
