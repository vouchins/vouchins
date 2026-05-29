const CACHE_NAME = "vouchins-cache-v1";
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

  // Don't intercept Next.js hot-reloads or api paths
  if (url.pathname.startsWith("/_next/") || url.pathname.startsWith("/api/")) {
    return;
  }

  // Bypass service worker interception completely on localhost/development
  // to avoid stale caching during development and preserve native redirect behaviors.
  if (url.hostname === "localhost" || url.hostname === "127.0.0.1") {
    return;
  }

  // 1. Navigation requests (HTML pages)
  // Always go to the network first. Do NOT cache dynamic pages to avoid auth/session caching issues.
  // If network fails (offline), fall back to the pre-cached offline fallback page.
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match(OFFLINE_URL);
      })
    );
    return;
  }

  // 2. Static assets (CSS, JS, Images, Icons, Manifest, Favicon)
  // Use Stale-While-Revalidate for static assets to ensure fast page loads.
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
          .catch(() => {});
        return cachedResponse;
      }

      return fetch(event.request).then((response) => {
        // Cache static assets on first load
        if (response && response.status === 200 && response.type === "basic") {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return response;
      });
    })
  );
});
