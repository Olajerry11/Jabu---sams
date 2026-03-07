const CACHE_NAME = 'jabu-sams-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/login.html',
  '/scanner.html',
  '/admin.html',
  '/style.css',
  '/script.js',
  '/login.js',
  '/scanner.js',
  '/admin.js'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => response || fetch(event.request))
  );
});