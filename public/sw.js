const CACHE_NAME = 'proof-fitness-v1.2.0';
const APP_SHELL = [
  '/',
  '/manifest.webmanifest',
  '/icons/proof-mark.svg',
  '/audio/coach/starter-run-coach.manifest.json',
  '/audio-scripts/starter-run.json'
];
const RUN_RESOURCE_PREFIXES = ['/audio/coach/','/audio/chimes/','/audio-scripts/'];
function isAllowedRunResource(resource) {
  return typeof resource === 'string' && !resource.includes('..') && RUN_RESOURCE_PREFIXES.some(prefix => resource.startsWith(prefix));
}

async function mediaResponse(request, cached) {
  const range = request.headers.get('range');
  if (!range || !cached) return cached;
  const match = /^bytes=(\d+)-(\d*)$/.exec(range);
  if (!match) return cached;
  const bytes = await cached.arrayBuffer();
  const start = Number(match[1]);
  const requestedEnd = match[2] ? Number(match[2]) : bytes.byteLength - 1;
  const end = Math.min(requestedEnd, bytes.byteLength - 1);
  if (start > end || start >= bytes.byteLength) {
    return new Response(null, {
      status: 416,
      headers: { 'Content-Range': `bytes */${bytes.byteLength}` }
    });
  }
  const headers = new Headers(cached.headers);
  headers.set('Accept-Ranges', 'bytes');
  headers.set('Content-Length', String(end - start + 1));
  headers.set('Content-Range', `bytes ${start}-${end}/${bytes.byteLength}`);
  return new Response(bytes.slice(start, end + 1), { status: 206, statusText: 'Partial Content', headers });
}

async function cacheCurrentAppShell() {
  const cache = await caches.open(CACHE_NAME);
  await cache.addAll(APP_SHELL);
  const shell = await cache.match('/');
  if (!shell) throw new Error('Application shell was not cached.');
  const html = await shell.text();
  const builtAssets = [...html.matchAll(/(?:src|href)=["'](\/assets\/[^"']+)["']/g)].map(match => match[1]);
  if (builtAssets.length) await cache.addAll([...new Set(builtAssets)]);
}

self.addEventListener('install', (event) => {
  event.waitUntil(cacheCurrentAppShell());
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key.startsWith('proof-fitness-') && key !== CACHE_NAME).map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
});

// Cache lifecycle is deliberately separate from IndexedDB. Application updates
// replace stale shell/audio caches without touching durable user records.

self.addEventListener('message', (event) => {
  if (event.data?.type !== 'CACHE_RUN_AUDIO') return;
  const requested = Array.isArray(event.data.resources) ? event.data.resources : [];
  const resources = requested.filter(isAllowedRunResource);
  event.waitUntil((async () => {
    let ok = false;
    try {
      const cache = await caches.open(CACHE_NAME);
      await cache.addAll(resources);
      ok = true;
    } catch (error) {
      console.warn('Proof Fitness offline audio download failed:', error);
    }
    const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    clients.forEach((client) => client.postMessage({ type: 'RUN_AUDIO_CACHE_STATUS', ok }));
  })());
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Audio is large: cache it after the first successful request instead of
  // delaying initial installation by pre-caching every coached-run track.
  if (url.origin === self.location.origin && url.pathname.startsWith('/audio/')) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(request);
        if (cached) return mediaResponse(request, cached);
        const response = await fetch(request);
        if (response.ok && response.status === 200 && !request.headers.has('range')) {
          await cache.put(request, response.clone());
        }
        return response;
      })
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request)
        .then((response) => {
          if (response.ok && url.origin === self.location.origin) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch((error) => {
          if (request.mode === 'navigate') return caches.match('/');
          throw error;
        });
    })
  );
});
