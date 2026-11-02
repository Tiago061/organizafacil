const CACHE = "organizafacil-v1";
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));
self.addEventListener("fetch", (e) => {
  const u = new URL(e.request.url);
  if (
    e.request.method !== "GET" ||
    u.origin !== self.location.origin ||
    u.pathname.startsWith("/@") ||
    u.pathname.startsWith("/src")
  )
    return;
  e.respondWith(
    fetch(e.request)
      .then((r) => {
        if (r.ok) {
          const copy = r.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copy));
        }
        return r;
      })
      .catch(async () => {
        const saved = await caches.match(e.request);
        if (saved) return saved;
        if (e.request.mode === "navigate")
          return (await caches.match("/")) || Response.error();
        return Response.error();
      }),
  );
});
