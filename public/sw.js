const CACHE_NAME = 'quickpick-v1';
const PRECACHE_URLS = ['/'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        return response;
      })
      .catch(() => caches.match(event.request).then((cached) => cached || caches.match('/')))
  );
});

// Push notification handler
self.addEventListener('push', (event) => {
  if (!event.data) return;

  let data;
  try {
    data = event.data.json();
  } catch {
    data = { title: 'QuickPick', body: event.data.text() };
  }

  const options = {
    body: data.body || '',
    icon: '/icon-192.png',
    badge: '/icon-72.png',
    tag: data.tag || 'quickpick-order',
    renotify: true,
    data: { url: data.url || '/order' },
    vibrate: [200, 100, 200],
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'QuickPick', options)
  );
});

// Click on notification opens the order page
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/order';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      return clients.openWindow(url);
    })
  );
});
