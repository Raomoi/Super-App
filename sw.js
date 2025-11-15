// Version du cache – incrémente-la à chaque version déployée
const CACHE_VERSION = 'mm-superapp-v2';
const CACHE_NAME = CACHE_VERSION;

// Fichiers à pré-cacher (ajuste si besoin)
const PRECACHE_URLS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './sw.js',
  './icon-192.png',
  './icon-512.png',
  './logo-maisonmoisan.jpg'
];

// Installation : on pré-charge les ressources essentielles
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
      .catch(err => {
        console.warn('[SW] Erreur pendant install:', err);
      })
  );
});

// Activation : on supprime les vieux caches et on prend la main tout de suite
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      ))
      .then(() => self.clients.claim())
      .catch(err => {
        console.warn('[SW] Erreur pendant activate:', err);
      })
  );
});

// Stratégie de fetch
self.addEventListener('fetch', event => {
  const request = event.request;

  // On ne gère que les requêtes GET
  if (request.method !== 'GET') {
    return;
  }

  const url = new URL(request.url);

  // 1) On NE TOUCHE PAS aux appels Apps Script (Google)
  if (url.origin === 'https://script.google.com') {
    return; // le navigateur gère directement
  }

  // 2) On ne gère que les requêtes vers le même domaine que la PWA
  if (url.origin !== self.location.origin) {
    return; // laisser passer les CDN, polices, etc.
  }

  // 3) Pour les navigations / HTML : stratégie "network first"
  if (request.mode === 'navigate' || request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(request)
        .then(response => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(request, copy);
          });
          return response;
        })
        .catch(() => {
          return caches.match(request).then(cached => {
            if (cached) return cached;
            return caches.match('./');
          });
        })
    );
    return;
  }

  // 4) Pour les autres ressources (JS, CSS, images…) : "cache first"
  event.respondWith(
    caches.match(request).then(cached => {
      if (cached) {
        return cached;
      }
      return fetch(request)
        .then(response => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(request, copy);
          });
          return response;
        })
        .catch(err => {
          console.warn('[SW] Erreur fetch ressource:', err);
          return cached || Promise.reject(err);
        });
    })
  );
});
