// Bump this on any caching strategy change so old SWs evict and re-cache.
const CACHE_NAME = 'pbsched-v3';

// Precache the app shell (paths relative to SW scope).
const PRECACHE = ['./', './index.html', './favicon.svg', './manifest.json'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const req = event.request;
  let url;
  try { url = new URL(req.url); } catch (e) { return; }

  // Only handle same-origin requests; let everything else hit the network.
  if (url.origin !== self.location.origin) return;

  // Navigation requests (HTML page loads): network-first with cache fallback.
  // This is the critical strategy — without it, a cached index.html that
  // references an old bundle hash gets served forever, locking users to
  // the build they first installed regardless of new deploys.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((response) => {
          if (response && response.status === 200 && response.type === 'basic') {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put('./index.html', clone));
          }
          return response;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  // All other same-origin GETs (hash-named JS/CSS assets, icons, manifest):
  // cache-first is safe because Vite emits content-hashed filenames, so a
  // new build means a new URL — the old URL's cached response is fine to
  // keep serving offline.
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((response) => {
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
        return response;
      });
    })
  );
});
