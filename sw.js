/* 1001birds service worker — safe strategy:
   images (same-origin /images + cross-origin jsDelivr) = cache-first (immutable via @v1 tag);
   everything else (html/css/js/data) = network-first, so shell updates are picked up immediately
   (avoids the stale-shell trap). Bump versions to purge. */
const SHELL = 'birds-shell-v4';
const IMGS  = 'birds-imgs-v2';
const CDN = 'https://cdn.jsdelivr.net/gh/xujiann/1001birds-img@v2/';

self.addEventListener('install', e => { self.skipWaiting(); });
self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== SHELL && k !== IMGS).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

const isImage = url =>
  url.startsWith(CDN) || /\/images\/.*\.(jpg|jpeg|png|gif|webp)$/i.test(url);

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = req.url;

  // images: cache-first (handle cross-origin jsDelivr before same-origin logic)
  if (isImage(url)) {
    e.respondWith((async () => {
      const cache = await caches.open(IMGS);
      const hit = await cache.match(req);
      if (hit) return hit;
      try {
        const res = await fetch(req, { mode: 'cors' });
        if (res && (res.ok || res.type === 'opaque')) cache.put(req, res.clone());
        return res;
      } catch {
        return hit || Response.error();
      }
    })());
    return;
  }

  // same-origin shell/data: network-first, fall back to cache offline
  if (url.startsWith(self.location.origin)) {
    e.respondWith((async () => {
      const cache = await caches.open(SHELL);
      try {
        const res = await fetch(req);
        if (res && res.ok) cache.put(req, res.clone());
        return res;
      } catch {
        const hit = await cache.match(req) || await cache.match('./') || await cache.match('index.html');
        return hit || Response.error();
      }
    })());
  }
});
