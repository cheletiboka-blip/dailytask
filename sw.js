const CACHE = "daily-task-v4";
const ASSETS = [
  "/",
  "/index.html",
  "/manifest.json",
  "/icon-192.png",
  "/icon-512.png",
  "/app.js",
  "/app.css"
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then((cache) =>
      Promise.allSettled(
        ASSETS.map((url) =>
          cache.add(url).catch((err) => {
            console.warn("Skipping asset (failed to cache):", url, err);
          })
        )
      )
    )
  );
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

  e.respondWith(
    caches.match(e.request).then((cachedResponse) => {
      // ১. যদি ক্যাশে থাকে, সরাসরি দ্রুত রিটার্ন করবে (প্রসেস বন্ধ থাকলেও কাজ করবে)
      if (cachedResponse) {
        // ব্যাকগ্রাউন্ডে নতুন আপডেট থাকলে ক্যাশে সিঙ্ক করার চেষ্টা করবে
        fetch(e.request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200 && e.request.url.startsWith(self.location.origin)) {
              const clone = networkResponse.clone();
              caches.open(CACHE).then((cache) => cache.put(e.request, clone));
            }
          })
          .catch(() => {
            /* অফলাইনে থাকলে কোনো ত্রুটি দেখাবে না */
          });

        return cachedResponse;
      }

      // ২. ক্যাশে না থাকলে নেটওয়ার্ক থেকে নিয়ে আসবে
      return fetch(e.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200 && e.request.url.startsWith(self.location.origin)) {
            const clone = networkResponse.clone();
            caches.open(CACHE).then((cache) => cache.put(e.request, clone));
          }
          return networkResponse;
        })
        .catch(async () => {
          // ৩. নেটওয়ার্ক ব্যর্থ হলে / অরেস্পন্সিভ হলে fallback
          if (e.request.mode === "navigate") {
            const fallback = (await caches.match("/index.html")) || (await caches.match("/"));
            if (fallback) return fallback;
          }
          return new Response("Offline and no cached version available.", {
            status: 503,
            statusText: "Service Unavailable",
            headers: { "Content-Type": "text/plain" },
          });
        });
    })
  );
});
