/* Offline for the guide itself — pages, data, JS, CSS.
   Map tiles are deliberately NOT pre-cached (62 MB for the corridor at street zoom);
   tiles you have already looked at stay in the runtime cache and work offline. */
const CACHE = "iceland-v1";
const SHELL = ["/", "/days", "/near", "/booked",
  "/days/1", "/days/2", "/days/3", "/days/4",
  "/days/5", "/days/6", "/days/7", "/days/8"];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const { request } = e;
  if (request.method !== "GET") return;
  const url = new URL(request.url);

  // tiles: serve from cache when we have them, otherwise network, and keep what we fetch
  if (/tile\.openstreetmap\.org|arcgisonline|opentopomap/.test(url.hostname)) {
    e.respondWith(
      caches.match(request).then(
        (hit) =>
          hit ||
          fetch(request)
            .then((res) => {
              const copy = res.clone();
              caches.open(CACHE + "-tiles").then((c) => c.put(request, copy));
              return res;
            })
            .catch(() => new Response("", { status: 504 }))
      )
    );
    return;
  }

  if (url.origin !== self.location.origin) return;

  // app: network first so a redeploy is picked up, cache as the offline fallback
  e.respondWith(
    fetch(request)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(request, copy));
        return res;
      })
      .catch(() => caches.match(request).then((hit) => hit || caches.match("/")))
  );
});
