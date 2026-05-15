/**
 * Jan Aushadhi Finder — Service Worker v2.0
 * Handles: offline caching, background sync, push notifications
 */

const CACHE_NAME = 'jan-aushadhi-v2.0.0';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Noto+Sans+Devanagari:wght@400;600&display=swap',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
];

const API_CACHE = 'jan-aushadhi-api-v2.0.0';
const API_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// ─── INSTALL ──────────────────────────────────────────────────────────────────
self.addEventListener('install', event => {
  console.log('[SW] Installing v2.0.0...');
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(STATIC_ASSETS.filter(url => !url.startsWith('http') || url.includes('fonts.googleapis') || url.includes('unpkg')));
    }).then(() => self.skipWaiting())
  );
});

// ─── ACTIVATE ─────────────────────────────────────────────────────────────────
self.addEventListener('activate', event => {
  console.log('[SW] Activating...');
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME && k !== API_CACHE).map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// ─── FETCH ────────────────────────────────────────────────────────────────────
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // API requests: network first, fallback to cache
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirstWithCache(request));
    return;
  }

  // Static assets: cache first, fallback to network
  if (request.method === 'GET') {
    event.respondWith(cacheFirstWithNetwork(request));
    return;
  }
});

async function networkFirstWithCache(request) {
  try {
    const networkResponse = await fetch(request.clone());
    if (networkResponse.ok && request.method === 'GET') {
      const cache = await caches.open(API_CACHE);
      const responseToCache = networkResponse.clone();
      // Add timestamp header
      const headers = new Headers(responseToCache.headers);
      const cachedResponse = new Response(await responseToCache.blob(), {
        status: responseToCache.status,
        headers
      });
      cache.put(request, cachedResponse);
    }
    return networkResponse;
  } catch (err) {
    const cached = await caches.match(request);
    if (cached) return cached;
    return new Response(JSON.stringify({ error: 'Offline - data may be stale', offline: true }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

async function cacheFirstWithNetwork(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (err) {
    // Offline fallback: serve index.html for navigation
    if (request.headers.get('accept')?.includes('text/html')) {
      return caches.match('/index.html');
    }
    return new Response('Offline', { status: 503 });
  }
}

// ─── PUSH NOTIFICATIONS ───────────────────────────────────────────────────────
self.addEventListener('push', event => {
  const data = event.data?.json() || {};
  const options = {
    body: data.body || 'Time to refill your medicine!',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-72.png',
    vibrate: [200, 100, 200],
    data: { url: data.url || '/', medicineId: data.medicineId },
    actions: [
      { action: 'find-store', title: '📍 Find Store' },
      { action: 'dismiss', title: '✕ Dismiss' }
    ],
    requireInteraction: false,
    tag: data.tag || 'refill-reminder'
  };
  event.waitUntil(
    self.registration.showNotification(data.title || '💊 Jan Aushadhi Reminder', options)
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  if (event.action === 'find-store') {
    event.waitUntil(clients.openWindow('/?tab=stores'));
  } else if (event.action !== 'dismiss') {
    event.waitUntil(clients.openWindow(event.notification.data?.url || '/'));
  }
});

// ─── BACKGROUND SYNC ──────────────────────────────────────────────────────────
self.addEventListener('sync', event => {
  if (event.tag === 'sync-reminders') {
    event.waitUntil(syncReminders());
  }
});

async function syncReminders() {
  try {
    const allClients = await clients.matchAll();
    allClients.forEach(client => client.postMessage({ type: 'SYNC_REMINDERS' }));
  } catch (err) {
    console.error('[SW] Sync failed:', err);
  }
}
