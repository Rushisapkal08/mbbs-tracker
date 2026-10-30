/* MBBS Tracker – service worker
 *
 * Goals: (1) make the app installable, (2) open instantly and work offline,
 * (3) never get in the way of sync.
 *
 * - Same-origin files (the app itself): network-first, so a new deploy is picked up
 *   as soon as you're online; falls back to the cached copy when offline / slow.
 * - Firebase SDK (pinned version) and Google Fonts: cached so the app can start offline.
 * - Everything else – Firestore, Auth, and all other API traffic – is NOT touched here.
 *
 * To force every device to refresh its cache after a release, bump VERSION.
 */
const VERSION = 'v1';
const SHELL = 'mbbs-shell-' + VERSION;
const RUNTIME = 'mbbs-runtime-' + VERSION;

const SHELL_FILES = [
  './',
  'index.html',
  'firebase-config.js',
  'pwa.js',
  'manifest.webmanifest',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/icon-maskable-512.png',
  'icons/apple-touch-icon.png',
  'icons/favicon.svg',
  'icons/favicon-32.png'
];

const INDEX_URL = new URL('index.html', self.registration.scope).href;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL)
      .then((cache) => cache.addAll(SHELL_FILES.map((u) => new Request(u, { cache: 'reload' }))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k !== SHELL && k !== RUNTIME).map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  if (url.origin === self.location.origin) {
    event.respondWith(networkFirst(req, 4000));
    return;
  }

  if (url.hostname === 'www.gstatic.com' && url.pathname.startsWith('/firebasejs/')) {
    event.respondWith(cacheFirst(req));
    return;
  }

  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(staleWhileRevalidate(req, event));
    return;
  }
  // Anything else (Firestore, Auth, …): fall through to the network untouched.
});

/* ---------- strategies ---------- */

function fetchWithTimeout(req, ms) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('timeout')), ms);
    fetch(req).then(
      (r) => { clearTimeout(t); resolve(r); },
      (e) => { clearTimeout(t); reject(e); }
    );
  });
}

async function networkFirst(req, timeoutMs) {
  const cache = await caches.open(SHELL);
  const isNav = req.mode === 'navigate';
  try {
    const res = await fetchWithTimeout(req, timeoutMs);
    if (res && res.ok && res.type === 'basic') {
      cache.put(isNav ? INDEX_URL : req, res.clone());
    }
    return res;
  } catch (err) {
    const cached = isNav
      ? await cache.match(INDEX_URL)
      : await cache.match(req, { ignoreSearch: true });
    if (cached) return cached;
    throw err;
  }
}

/* Cross-origin helpers: ask for a CORS response so it can be cached as a normal
 * (non-opaque) response; fall back to the page's own request if CORS isn't allowed. */
async function fetchCors(req) {
  try {
    const r = await fetch(req.url, { mode: 'cors', credentials: 'omit' });
    if (r && r.ok) return r;
  } catch (_) { /* fall through */ }
  return fetch(req);
}

function cacheable(res) {
  return res && (res.ok || res.type === 'opaque');
}

async function cacheFirst(req) {
  const cache = await caches.open(RUNTIME);
  const hit = await cache.match(req.url, { ignoreVary: true });
  if (hit) return hit;
  const res = await fetchCors(req);
  if (cacheable(res)) cache.put(req.url, res.clone());
  return res;
}

async function staleWhileRevalidate(req, event) {
  const cache = await caches.open(RUNTIME);
  const hit = await cache.match(req.url, { ignoreVary: true });
  const refresh = fetchCors(req)
    .then((res) => { if (cacheable(res)) cache.put(req.url, res.clone()); return res; })
    .catch(() => null);
  if (hit) {
    event.waitUntil(refresh);
    return hit;
  }
  return (await refresh) || Response.error();
}
