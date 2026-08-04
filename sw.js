const CACHE = "daily-task-v1";
const ASSETS = ["./", "./index.html", "./manifest.json", "./icon-192.png", "./icon-512.png"];

// Analytics/tracking requests must always hit the network directly — never
// served from cache and never written into it. Caching these would return
// stale beacons (or none at all when offline, which is fine for analytics
// but wrong if we accidentally cached a real response) and would also
// bloat the cache with third-party traffic the app doesn't own.
const ANALYTICS_HOSTS = [
  "google-analytics.com",
  "analytics.google.com",
  "googletagmanager.com",
];
function isAnalyticsRequest(url) {
  try {
    const host = new URL(url).hostname;
    return ANALYTICS_HOSTS.some((h) => host === h || host.endsWith("." + h));
  } catch {
    return false;
  }
}

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  if (isAnalyticsRequest(e.request.url)) {
    // Bypass the cache entirely — go straight to the network, and don't
    // fall back to a cached response on failure (there won't be one, and
    // there shouldn't be).
    e.respondWith(fetch(e.request));
    return;
  }
  e.respondWith(
    caches.match(e.request).then((cached) => {
      const fetchPromise = fetch(e.request)
        .then((res) => {
          if (res && res.status === 200 && e.request.url.startsWith(self.location.origin)) {
            const clone = res.clone();
            caches.open(CACHE).then((cache) => cache.put(e.request, clone));
          }
          return res;
        })
        .catch(() => cached);
      return cached || fetchPromise;
    })
  );
});
