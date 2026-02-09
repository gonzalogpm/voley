const CACHE_NAME = 'volleycoach-v3';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png'
];

// Instalación FORZADA
self.addEventListener('install', event => {
  console.log('[Service Worker] Instalando versión v3...');
  
  // Forzar activación inmediata
  self.skipWaiting();
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[Service Worker] Cacheando recursos críticos');
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log('[Service Worker] Instalación completada');
        return self.skipWaiting();
      })
  );
});

// Activación AGGRESIVA
self.addEventListener('activate', event => {
  console.log('[Service Worker] Activando versión v3...');
  
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          // Eliminar TODOS los caches viejos
          console.log('[Service Worker] Eliminando cache viejo:', cacheName);
          return caches.delete(cacheName);
        })
      );
    }).then(() => {
      console.log('[Service Worker] Reclamando todos los clients');
      return self.clients.claim();
    })
  );
  
  // Forzar control inmediato
  self.clients.claim();
});

// Fetch con fallback robusto
self.addEventListener('fetch', event => {
  // Ignorar solicitudes que no son HTTP o son del mismo origin
  if (!event.request.url.startsWith('http')) return;
  
  // Para navegación (página principal)
  if (event.request.mode === 'navigate') {
    event.respondWith(
      caches.match('/index.html')
        .then(response => {
          if (response) {
            console.log('[SW] Sirviendo index.html desde cache');
            return response;
          }
          
          // Intentar red
          return fetch(event.request)
            .then(networkResponse => {
              // Guardar en cache
              const responseClone = networkResponse.clone();
              caches.open(CACHE_NAME)
                .then(cache => cache.put(event.request, responseClone));
              return networkResponse;
            })
            .catch(() => {
              // Fallback definitivo
              return new Response(
                `
                <!DOCTYPE html>
                <html>
                <head>
                  <meta charset="UTF-8">
                  <meta name="viewport" content="width=device-width, initial-scale=1.0">
                  <title>VolleyCoach</title>
                  <style>
                    body { 
                      background: #0f172a; 
                      color: white; 
                      font-family: sans-serif;
                      display: flex;
                      justify-content: center;
                      align-items: center;
                      height: 100vh;
                      margin: 0;
                      text-align: center;
                      padding: 20px;
                    }
                    .container { max-width: 400px; }
                    h1 { color: #3b82f6; }
                    button {
                      background: #3b82f6;
                      color: white;
                      border: none;
                      padding: 12px 24px;
                      border-radius: 8px;
                      cursor: pointer;
                      margin-top: 20px;
                      font-size: 16px;
                    }
                  </style>
                </head>
                <body>
                  <div class="container">
                    <h1>🏐 VolleyCoach Pro</h1>
                    <p>La aplicación está cargando en modo offline...</p>
                    <p>Si es la primera vez, necesitas conexión a internet.</p>
                    <button onclick="location.reload()">Reintentar</button>
                    <p style="margin-top: 20px; font-size: 12px; color: #94a3b8;">
                      App offline - Service Worker v3
                    </p>
                  </div>
                </body>
                </html>
                `,
                {
                  headers: {
                    'Content-Type': 'text/html; charset=utf-8'
                  }
                }
              );
            });
        })
    );
    return;
  }
  
  // Para otros recursos (JS, CSS, imágenes)
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Cache hit
        if (response) {
          return response;
        }
        
        // Network fallback
        return fetch(event.request)
          .then(networkResponse => {
            // Verificar respuesta válida
            if (!networkResponse || networkResponse.status !== 200) {
              return networkResponse;
            }
            
            // Clonar y cachear
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });
            
            return networkResponse;
          })
          .catch(error => {
            console.log('[SW] Error de red:', error);
            
            // Para imágenes, devolver imagen placeholder
            if (event.request.destination === 'image') {
              return new Response(
                `<svg width="100" height="100" xmlns="http://www.w3.org/2000/svg">
                  <rect width="100" height="100" fill="#1e293b"/>
                  <text x="50" y="50" font-family="Arial" font-size="14" fill="#64748b" text-anchor="middle" dy=".3em">IMG</text>
                </svg>`,
                {
                  headers: {
                    'Content-Type': 'image/svg+xml'
                  }
                }
              );
            }
            
            // Para otros recursos, devolver error controlado
            return new Response('Resource unavailable offline', {
              status: 503,
              statusText: 'Service Unavailable'
            });
          });
      })
  );
});

// Manejar mensajes desde la app
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});