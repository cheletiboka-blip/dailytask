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

  // URL Normalization for Cache matching
  const requestUrl = new URL(e.request.url);

  e.respondWith(
    caches.match(e.request).then((cachedResponse) => {
      // ১. ক্যাশে থাকলে সরাসরি ক্যাশ থেকেই ফেরত দেবে (অফলাইন ও প্রসেস বন্ধ থাকলেও চলবে)
      if (cachedResponse) {
        // ব্যাকগ্রাউন্ডে সাইলেন্ট আপডেট
        fetch(e.request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200 && requestUrl.origin === self.location.origin) {
              const clone = networkResponse.clone();
              caches.open(CACHE).then((cache) => cache.put(e.request, clone));
            }
          })
          .catch(() => {
            /* অফলাইনে থাকলে ব্যাকগ্রাউন্ড এরর ইগনোর করবে */
          });

        return cachedResponse;
      }

      // ২. ক্যাশে না থাকলে নেটওয়ার্ক থেকে আনবে
      return fetch(e.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200 && requestUrl.origin === self.location.origin) {
            const clone = networkResponse.clone();
            caches.open(CACHE).then((cache) => cache.put(e.request, clone));
          }
          return networkResponse;
        })
        .catch(async () => {
          // ৩. নেটওয়ার্ক ব্যর্থ হলে (ERR_FAILED বা অফলাইন) ফ্যালব্যাক পেজ দেখাবে
          if (e.request.mode === "navigate") {
            const fallback = (await caches.match("/index.html")) || (await caches.match("/"));
            if (fallback) return fallback;
          }
          return new Response("Offline and no cached version available.", {
            status: 503,
            statusText: "Service Unavailable",
            headers: { "Content-Type": "text/plain; charset=utf-8" },
          });
        });
    })
  );
});
