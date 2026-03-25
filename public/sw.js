const CACHE_NAME = 'morning-briefing-v3';
const STATIC_ASSETS = [
  '/',
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

// Fetch: network-first for API, stale-while-revalidate for pages
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET and cross-origin
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;

  // API calls: network-first with 8s timeout, stale cache fallback
  if (url.pathname.startsWith('/api/')) {
    // Skip caching for analytics/subscribe (write-only endpoints)
    if (url.pathname.includes('/analytics') || url.pathname.includes('/subscribe')) return;

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
