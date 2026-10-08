const CACHE_NAME = "ssakiwo-static-v2";
const OFFLINE_PAGE = "/offline.html";

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.add(OFFLINE_PAGE)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    Promise.all([
      caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))),
      self.clients.claim(),
    ]),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(() => caches.match(OFFLINE_PAGE)));
    return;
  }

  const isVersionedAsset = url.pathname.startsWith("/_next/static/");
  const isPublicImage = url.pathname.startsWith("/images/") || url.pathname.startsWith("/plants/");
  if (!isVersionedAsset && !isPublicImage) return;

  const fetchAndCache = () => fetch(request).then((response) => {
    if (response.ok) {
      const copy = response.clone();
      void caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
    }
    return response;
  });

  event.respondWith(
    isVersionedAsset
      ? caches.match(request).then((cached) => cached || fetchAndCache())
      : fetchAndCache().catch(() => caches.match(request)),
  );
});
