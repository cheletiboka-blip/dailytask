const CACHE = "daily-task-v2"; // ⚠️ ভার্সন বাড়ানো হলো, নতুন করে cache তৈরি হবে
const ASSETS = ["./", "./index.html", "./manifest.json", "./icon-192.png", "./icon-512.png", "./app.js", "./app.css"];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then((cache) => {
      // addAll এর বদলে প্রতিটা asset আলাদাভাবে cache করা হচ্ছে,
      // যাতে একটা file missing/404 হলেও বাকিগুলো cache থেকে যায়
      return Promise.allSettled(
        ASSETS.map((url) =>
          cache.add(url).catch((err) => {
            console.warn("Cache failed for:", url, err);
          })
        )
      );
    })
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

  const isNavigation =
    e.request.mode === "navigate" ||
    (e.request.headers.get("accept") || "").includes("text/html");

  e.respondWith(
    (async () => {
      const cached = await caches.match(e.request);

      try {
        const fresh = await fetch(e.request);
        if (fresh && fresh.status === 200 && e.request.url.startsWith(self.location.origin)) {
          const cache = await caches.open(CACHE);
          cache.put(e.request, fresh.clone());
        }
        return fresh;
      } catch (err) {
        // Network fail করলে আগে cached response দেখাও
        if (cached) return cached;

        // navigation (app open) request হলে index.html fallback দাও,
        // যাতে কখনো "This site can't be reached" না আসে
        if (isNavigation) {
          const fallback = await caches.match("./index.html");
          if (fallback) return fallback;
        }

        // একদম কিছুই না পাওয়া গেলে (undefined respondWith করা যাবে না)
        return new Response(
          "অফলাইন — ইন্টারনেট সংযোগ পরীক্ষা করুন।",
          { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" } }
        );
      }
    })()
  );
});
