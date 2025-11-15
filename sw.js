const CACHE_NAME = "mm-superapp-v1-ionos-root";

const ASSETS = [
  "/",                  // page d'accueil
  "/index.html",
  "/manifest.webmanifest",
  "/sw.js",
  "/icon-192.png",
  "/icon-512.png",
  "/logo-maisonmoisan.jpg"
];

// Installation : on pré-cache les assets de base
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS).catch((err) => {
        console.warn("[SW] Erreur lors du precache:", err);
      });
    })
  );
});

// Activation : nettoyage des anciens caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
});

// Stratégie cache-avec-retour-réseau
self.addEventListener("fetch", (event) => {
  const req = event.request;

  // On ne gère que les GET
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // On ne touche pas aux requêtes externes (Google Apps Script, etc.)
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(req).then((cacheRes) => {
      if (cacheRes) return cacheRes;

      return fetch(req)
        .then((networkRes) => {
          const resClone = networkRes.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(req, resClone);
          });
          return networkRes;
        })
        .catch(() => {
          if (req.mode === "navigate") {
            return caches.match("/index.html");
          }
          return new Response("Offline", { status: 503, statusText: "Offline" });
        });
    })
  );
});
