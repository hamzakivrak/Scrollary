// Önbellek adını v2 yaptık. Bunu gören telefon eski v1 önbelleğini silecektir.
const CACHE_NAME = 'scrollary-cache-v2';

// Sonlarına versiyon numarası eklenmiş güncel dosyalarımız
const urlsToCache = [
  './',
  './index.html',
  './style.css?v=2.9',
  './script.js?v=2.9',
  './manifest.json',
  './icon.png',
  './splash.png'
];

self.addEventListener('install', event => {
  self.skipWaiting(); // Yeni versiyonu hemen devreye sok
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(urlsToCache);
      })
  );
});

// Eski önbellekleri (v1 gibi) temizleme işlemi
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Eski önbellek siliniyor:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Cache'de varsa onu dön, yoksa ağdan çek
        return response || fetch(event.request);
      })
  );
});
