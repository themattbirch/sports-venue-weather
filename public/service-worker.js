// public/service-worker.js

const CACHE_NAME = "stadium-weather-v1";

// Precache the specified resources
const PRECACHE_URLS = [
  "/",
  "/index.html",
  "/offline.html",
  "/manifest.webmanifest",
  "/icons/football16.png",
  "/icons/football32.png",
  "/icons/football192.png",
  "/icons/football512.png",
];

// The path to your offline fallback
const OFFLINE_FALLBACK_URL = "/offline.html";

// Install event: Precache resources
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_URLS);
    })
  );
  self.skipWaiting();
});

// Activate event: Clean up old caches
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

// Fetch event: Serve cached content when offline
self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  event.respondWith(
    (async () => {
      const cachedResponse = await caches.match(request);
      if (cachedResponse) {
        return cachedResponse;
      }
      try {
        const networkResponse = await fetch(request);
        if (networkResponse && networkResponse.ok) {
          const cache = await caches.open(CACHE_NAME);
          cache.put(request, networkResponse.clone());
        }
        return networkResponse;
      } catch (err) {
        // For navigations, return offline fallback
        if (request.mode === "navigate") {
          const fallback = await caches.match(OFFLINE_FALLBACK_URL);
          return fallback || new Response("Offline", { status: 503 });
        }
        return new Response("Offline", { status: 503 });
      }
    })()
  );
});
