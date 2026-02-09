const CACHE_NAME = 'volleycoach-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png'
];

// Instalar Service Worker
self.addEventListener('install', event => {
  console.log('[Service Worker] Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[Service Worker] Caching app shell');
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log('[Service Worker] Install completed');
        return self.skipWaiting();
      })
  );
});

// Activar Service Worker
self.addEventListener('activate', event => {
  console.log('[Service Worker] Activating...');
  // Limpiar caches viejos
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('[Service Worker] Claiming clients');
      return self.clients.claim();
    })
  );
});

// Interceptar solicitudes
self.addEventListener('fetch', event => {
  // Solo manejar solicitudes HTTP/HTTPS
  if (!event.request.url.startsWith('http')) return;
  
  console.log('[Service Worker] Fetching:', event.request.url);
  
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Cache hit - devolver respuesta del cache
        if (response) {
          console.log('[Service Worker] Serving from cache:', event.request.url);
          return response;
        }
        
        // No está en cache - hacer solicitud de red
        console.log('[Service Worker] Fetching from network:', event.request.url);
        return fetch(event.request)
          .then(response => {
            // Verificar si la respuesta es válida
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            
            // Clonar la respuesta para cachearla
            const responseToCache = response.clone();
            
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
                console.log('[Service Worker] Caching new resource:', event.request.url);
              });
            
            return response;
          })
          .catch(error => {
            console.log('[Service Worker] Network request failed:', error);
            // Puedes devolver una página offline personalizada aquí
            return new Response('No internet connection', {
              status: 503,
              statusText: 'Service Unavailable',
              headers: new Headers({
                'Content-Type': 'text/plain'
              })
            });
          });
      })
  );
});

// Manejar mensajes desde la app
self.addEventListener('message', event => {
  if (event.data === 'skipWaiting') {
    self.skipWaiting();
  }
});