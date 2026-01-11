const CACHE_VERSION = 'v2';
const PRECACHE = `glance-precache-${CACHE_VERSION}`;
const RUNTIME = `glance-runtime-${CACHE_VERSION}`;

const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/offline.html',
  '/css/style.css',
  '/js/script.js',
  '/preview.png',
  '/back_ground.jpg'
];

function isNavigationRequest(request) {
  return request.mode === 'navigate' || (request.method === 'GET' && request.headers.get('accept') && request.headers.get('accept').includes('text/html'));
}

// Install: pre-cache resources
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(PRECACHE).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

// Activate: clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter((key) => key !== PRECACHE && key !== RUNTIME).map((key) => caches.delete(key))
    ))
  );
  self.clients.claim();
});

// Utility: network-first with cache fallback
async function networkFirst(request) {
  const cache = await caches.open(RUNTIME);
  try {
    const response = await fetch(request);
    if (response && response.status === 200) {
      cache.put(request, response.clone()).catch(()=>{});
    }
    return response;
  } catch (err) {
    const cached = await cache.match(request);
    if (cached) return cached;
    return caches.match('/offline.html');
  }
}

// Utility: cache-first with background update
async function cacheFirst(request) {
  const cache = await caches.open(RUNTIME);
  const cached = await cache.match(request);
  if (cached) {
    // Fetch in background to update the cache
    fetch(request).then((resp) => {
      if (resp && resp.status === 200) cache.put(request, resp.clone());
    }).catch(()=>{});
    return cached;
  }
  try {
    const response = await fetch(request);
    if (response && response.status === 200) cache.put(request, response.clone());
    return response;
  } catch (err) {
    return caches.match('/offline.html');
  }
}

// Fetch handler: apply strategies based on request type
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const requestUrl = new URL(event.request.url);

  // API requests (example: myquran) - network first with cache fallback
  if (requestUrl.hostname && requestUrl.hostname.includes('api.myquran.com')) {
    event.respondWith(networkFirst(event.request));
    return;
  }

  // Navigation requests - network first, fallback to cache and offline page
  if (isNavigationRequest(event.request)) {
    event.respondWith(networkFirst(event.request));
    return;
  }

  // Static same-origin assets: css, js, images -> cache-first
  if (requestUrl.origin === self.location.origin) {
    if (requestUrl.pathname.match(/\.(?:js|css|png|jpg|jpeg|svg|webp|gif|ico)$/)) {
      event.respondWith(cacheFirst(event.request));
      return;
    }
  }

  // Fallback to network, then cache
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request)).catch(() => caches.match('/offline.html'))
  );
});

// Listen for messages from the client (e.g., skipWaiting)
self.addEventListener('message', (event) => {
  if (!event.data) return;
  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

