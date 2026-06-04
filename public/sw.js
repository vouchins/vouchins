const CACHE_NAME = "vouchins-cache-v2";
const OFFLINE_URL = "/offline.html";

const ASSETS_TO_CACHE = [
  "/offline.html",
  "/favicon.png",
  "/images/logo.png",
  "/manifest.json"
];

// Install event: cache core assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("[Service Worker] Pre-caching offline pages and assets");
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// Activate event: clean up outdated caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log("[Service Worker] Deleting outdated cache:", cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event: handle offline fallback for navigation, and cache static assets
self.addEventListener("fetch", (event) => {
  // Only intercept GET requests
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);

  // Focus only on local origin requests
  if (url.origin !== self.location.origin) return;

  // Bypass service worker interception completely on localhost/development
  // to avoid stale caching during development.
  if (url.hostname === "localhost" || url.hostname === "127.0.0.1") {
    return;
  }

  // 1. Navigation requests (HTML pages)
  // Always go to the network first. If offline, fall back to the pre-cached offline page.
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match(OFFLINE_URL);
      })
    );
    return;
  }

  // 2. Only intercept and cache static assets
  // Next.js static JS/CSS, images, icons, manifests, favicons, fonts
  const isStaticAsset = 
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/images/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname === "/favicon.png" ||
    url.pathname === "/manifest.json" ||
    /\.(js|css|png|jpg|jpeg|gif|svg|ico|webp|woff2|woff|ttf)$/i.test(url.pathname);

  // Do not intercept dynamic pages, RSC payloads (?_rsc=), or API calls
  if (!isStaticAsset || url.pathname.startsWith("/api/") || url.searchParams.has("_rsc")) {
    return;
  }

  // Use Stale-While-Revalidate for static assets
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Fetch fresh version in the background to update cache
        fetch(event.request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, networkResponse);
              });
            }
          })
          .catch(() => {}); // Quietly catch background fetch failures
        return cachedResponse;
      }

      return fetch(event.request)
        .then((response) => {
          if (response && response.status === 200) {
            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return response;
        })
        .catch(() => {
          // Return a silent offline fallback response for static assets
          return new Response("Offline", { status: 408, statusText: "Offline" });
        });
    })
  );
});
