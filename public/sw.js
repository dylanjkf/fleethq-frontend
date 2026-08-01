/* eslint-env serviceworker */
/*
 * FleetHQ service worker. Two jobs:
 *
 * 1. App-shell caching + installability. FleetHQ is the office app, so it's
 *    less offline-critical than DriverOS — but the same runtime-caching shell
 *    makes it installable (home-screen, standalone window) and makes reloads
 *    instant. Same strategy as DriverOS's worker: navigations network-first
 *    with a cached-shell fallback, static assets stale-while-revalidate, and
 *    API calls (/v1, /health) never cached here (data freshness is the app's
 *    own concern).
 *
 * 2. Web Push (unchanged): show the backend's notification, focus/open the
 *    linked page on click.
 */

const CACHE = 'fleethq-shell-v1';
const APP_SHELL = '/index.html';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(['/', APP_SHELL])).then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

function isApiRequest(url) {
  return url.pathname.startsWith('/v1') || url.pathname.startsWith('/health');
}

// The admin app is a separate SPA served from the same origin under /admin.
// This (office) worker must never touch those requests — otherwise its
// navigation fallback would serve the office app's HTML shell for an /admin/*
// route, booting the wrong app offline. Let the browser/network handle them.
function isAdminRequest(url) {
  return url.pathname === '/admin' || url.pathname.startsWith('/admin/');
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (isApiRequest(url)) return;
  if (isAdminRequest(url)) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match(APP_SHELL).then((r) => r || caches.match('/'))),
    );
    return;
  }

  event.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const cached = await cache.match(request);
      const network = fetch(request)
        .then((response) => {
          if (response && response.ok) cache.put(request, response.clone());
          return response;
        })
        .catch(() => undefined);
      return cached || (await network) || fetch(request);
    }),
  );
});

// --- Web Push (unchanged behaviour) ------------------------------------------
self.addEventListener('push', (event) => {
  if (!event.data) return;
  let payload = {};
  try {
    payload = event.data.json();
  } catch {
    payload = { title: 'FleetOS', body: event.data.text() };
  }
  const title = payload.title || 'FleetOS';
  event.waitUntil(
    self.registration.showNotification(title, {
      body: payload.body || '',
      data: { linkPath: payload.linkPath || '/' },
      icon: '/icon-192.png',
      badge: '/icon-192.png',
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const linkPath = event.notification.data?.linkPath || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          client.postMessage({ type: 'navigate', path: linkPath });
          return client.focus();
        }
      }
      return self.clients.openWindow(linkPath);
    }),
  );
});
