const CACHE_NAME = 'prestamos-v1';

const ARCHIVOS = [
  './',
  './index.html',
  './manifest.json',
  './css/estilos.css',
  './js/app.js',
  './js/pwa.js',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

// Instalar: guarda todos los archivos en caché
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ARCHIVOS))
      .then(() => self.skipWaiting())
  );
});

// Activar: elimina cachés viejas
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k !== CACHE_NAME)
          .map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// Fetch: responde desde caché, con red como respaldo
self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request)
      .then(cached => cached || fetch(e.request))
      .catch(() => caches.match('./index.html'))
  );
});