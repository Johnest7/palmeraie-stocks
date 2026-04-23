// Service worker — réseau en priorité, pas de cache
self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  // Laisser passer toutes les requêtes sans cache
  if (!event.request.url.startsWith('http')) return;
  event.respondWith(fetch(event.request));
});