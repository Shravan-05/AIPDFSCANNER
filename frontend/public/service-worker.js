const CACHE_NAME = 'aurascan-v3';
const API_CACHE_NAME = 'aurascan-api-v1';

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.ico',
  '/logo192.png',
  '/logo512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME && name !== API_CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== 'GET') return;

  if (url.pathname.startsWith('/api/pdf/ollama/') || url.pathname.startsWith('/api/pdf/ai-edit')) {
    event.respondWith(networkOnly(request));
    return;
  }

  if (url.pathname.startsWith('/api/pdf/') || url.pathname.startsWith('/api/files/')) {
    event.respondWith(networkFirstWithTimeout(request, 15000));
    return;
  }

  if (url.pathname.startsWith('/api/')) {
    event.respondWith(staleWhileRevalidate(request, API_CACHE_NAME, 120));
    return;
  }

  if (url.pathname.startsWith('/uploads/')) {
    event.respondWith(networkFirst(request));
    return;
  }

  if (
    url.pathname.startsWith('/static/') ||
    url.pathname.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff2?)$/)
  ) {
    event.respondWith(networkFirst(request));
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request));
    return;
  }

  event.respondWith(networkFirst(request));
});

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    if (request.mode === 'navigate') {
      return caches.match('/index.html');
    }
    return new Response('Offline', { status: 503 });
  }
}

async function staleWhileRevalidate(request, cacheName, ttlSeconds = 60) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  
  if (cached) {
    const cachedTime = new Date(cached.headers.get('sw-cached-at') || 0).getTime();
    const isFresh = (Date.now() - cachedTime) < ttlSeconds * 1000;
    if (isFresh) return cached;
  }

  try {
    const response = await fetch(request);
    if (response.ok && response.status === 200) {
      const headers = new Headers(response.headers);
      headers.append('sw-cached-at', new Date().toISOString());
      cache.put(request, new Response(response.clone().body, { status: response.status, statusText: response.statusText, headers }));
    }
    return response;
  } catch {
    if (cached) return cached;
    return new Response(JSON.stringify({ msg: 'Offline' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

async function networkOnly(request) {
  try {
    return await fetch(request);
  } catch {
    return new Response(JSON.stringify({ msg: 'Network required for this operation' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

async function networkFirstWithTimeout(request, timeout) {
  const timeoutPromise = new Promise((resolve) => {
    setTimeout(() => resolve(null), timeout);
  });

  try {
    const response = await Promise.race([
      fetch(request.clone()),
      timeoutPromise
    ]);

    if (response) {
      if (response.ok && response.status === 200) {
        const cache = await caches.open(CACHE_NAME);
        cache.put(request, response.clone());
      }
      return response;
    }

    const cached = await caches.match(request);
    if (cached) return cached;
    return new Response(JSON.stringify({ msg: 'Request timeout' }), {
      status: 408,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    return new Response(JSON.stringify({ msg: 'Network error' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
