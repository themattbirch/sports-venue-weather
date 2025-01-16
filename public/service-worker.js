// public/service-worker.js

const CACHE_NAME = "sports-venu-weather";
// If your site is served at / (root) with an index.html, great.
// Otherwise, remove or adjust the lines that don't exist in your final build.
const PRECACHE_URLS = [
  "/index.html", 
  "/offline.html",
  "/manifest.webmanifest",
];

const OFFLINE_FALLBACK_URL = "/offline.html";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_URLS).catch((err) => {
        console.error("Precache error:", err);
        console.error("Likely a missing resource in PRECACHE_URLS.");
        throw err;
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      for (const key of keys) {
        if (key !== CACHE_NAME) {
          await caches.delete(key);
        }
      }
    })()
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return; // Only cache GETs

  event.respondWith(
    (async () => {
      // 1) Check cache
      const cachedResponse = await caches.match(request);
      if (cachedResponse) {
        return cachedResponse;
      }
      // 2) If not cached, fetch from network
      try {
        const networkResponse = await fetch(request);
        if (networkResponse && networkResponse.ok) {
          const cache = await caches.open(CACHE_NAME);
          cache.put(request, networkResponse.clone());
        }
        return networkResponse;
      } catch (err) {
        // 3) If offline, return fallback for navigations
        if (request.mode === "navigate") {
          const fallback = await caches.match(OFFLINE_FALLBACK_URL);
          return fallback || new Response("Offline", { status: 503 });
        }
        // else, just return an error response
        return new Response("Offline", { status: 503 });
      }
    })()
  );
});
