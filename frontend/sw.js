/**
 * sw.js — Service Worker
 * ----------------------
 * This makes the app a real PWA:
 * - Caches all frontend files on first load
 * - Serves them from cache if offline
 * - API calls still need internet (we don't cache dynamic data)
 *
 * HOW IT WORKS:
 * 1. On install: download and cache all static files
 * 2. On fetch: if the request is for a static file, serve from cache
 *    If it's an API call (/api/...), always go to network
 */

const CACHE_NAME = 'palmeraie-v1';

// Static files to cache on install
const STATIC_FILES = [
  '/',
  '/index.html',
  '/login.html',
  '/style.css',
  '/api.js',
  '/app.js',
  '/manifest.json',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css'
];

// Install: cache static assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(STATIC_FILES);
    })
  );
  self.skipWaiting();
});

// Activate: clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// Fetch: serve from cache for static, network for API
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Always go to network for API calls
  if (url.port === '8000' || url.pathname.startsWith('/auth') ||
      url.pathname.startsWith('/products') || url.pathname.startsWith('/shopping') ||
      url.pathname.startsWith('/exits') || url.pathname.startsWith('/losses') ||
      url.pathname.startsWith('/reports')) {
    return; // Let the browser handle it normally
  }

  // For static files: cache first, then network
  event.respondWith(
    caches.match(event.request).then(cached => {
      return cached || fetch(event.request).then(response => {
        // Cache new static files we encounter
        if (response.ok && event.request.method === 'GET') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      });
    }).catch(() => {
      // Offline fallback for navigation requests
      if (event.request.mode === 'navigate') {
        return caches.match('/index.html');
      }
    })
  );
});
