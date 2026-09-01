/* Baseline Control service worker.
   Stale while revalidate for same origin GETs: the page opens instantly from
   cache and quietly updates itself, so a deploy reaches you on the next load. */
const VERSION = "1.2.1";
const CACHE = "baseline-control-" + VERSION;
const SHELL = [
  "./",
  "index.html",
  "manifest.webmanifest",
  "src/style.css",
  "src/03-core.js",
  "src/04-world.js",
  "src/05-changes.js",
  "src/06-release.js",
  "src/07-tasks-a.js",
  "src/08-tasks-b.js",
  "src/09-tasks-c.js",
  "src/10-codex.js",
  "src/11-store.js",
  "src/16-teach.js",
  "src/12-engine.js",
  "src/13-ui-items.js",
  "src/14-ui-core.js",
  "src/17-teach-ui.js",
  "src/15-boot-sw.js",
  "icons/icon.svg",
  "icons/icon-192.png",
  "icons/icon-512.png"
];

self.addEventListener("install", (ev) => {
  ev.waitUntil(
    caches.open(CACHE)
      .then((c) => Promise.allSettled(SHELL.map((u) => c.add(u))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (ev) => {
  ev.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (ev) => {
  const req = ev.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;   // fonts and anything else go straight to the network

  ev.respondWith(
    caches.open(CACHE).then((cache) =>
      cache.match(req).then((hit) => {
        const net = fetch(req)
          .then((res) => {
            if (res && res.status === 200 && res.type === "basic") cache.put(req, res.clone());
            return res;
          })
          .catch(() => hit);
        return hit || net;
      })
    )
  );
});
