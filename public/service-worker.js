/**
 * PTV-TRMNL Service Worker
 * Implements offline resilience (Principle J)
 *
 * @version 1.0.0
 * @principle J. Offline Resilience
 */

const CACHE_NAME = 'ptv-trmnl-v1';
const STATIC_CACHE = 'ptv-trmnl-static-v1';
const DATA_CACHE = 'ptv-trmnl-data-v1';

// Static assets to cache on install
const STATIC_ASSETS = [
  '/',
  '/admin',
  '/admin.html',
  '/styles.css'
];

// API endpoints to cache with network-first strategy
const CACHEABLE_APIS = [
  '/api/status',
  '/api/health',
  '/admin/preferences',
  '/admin/weather',
  '/api/fallback-stops'
];

// Cache duration for different content types (in milliseconds)
const CACHE_DURATIONS = {
  static: 7 * 24 * 60 * 60 * 1000,  // 7 days for static assets
  api: 5 * 60 * 1000,               // 5 minutes for API responses
  transit: 2 * 60 * 1000,           // 2 minutes for transit data
  weather: 15 * 60 * 1000           // 15 minutes for weather
};

/**
 * Install event - cache static assets
 */
self.addEventListener('install', (event) => {
  console.log('[ServiceWorker] Install');

  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('[ServiceWorker] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

/**
 * Activate event - clean up old caches
 */
self.addEventListener('activate', (event) => {
  console.log('[ServiceWorker] Activate');

  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== STATIC_CACHE && name !== DATA_CACHE)
          .map((name) => {
            console.log('[ServiceWorker] Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    }).then(() => self.clients.claim())
  );
});

/**
 * Fetch event - implement caching strategies
 */
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip chrome-extension and other non-http(s) requests
  if (!url.protocol.startsWith('http')) {
    return;
  }

  // Determine caching strategy based on request type
  if (isStaticAsset(url)) {
    event.respondWith(cacheFirst(request));
  } else if (isCacheableApi(url)) {
    event.respondWith(networkFirstWithCache(request));
  } else if (isTransitApi(url)) {
    event.respondWith(networkFirstWithFallback(request));
  } else {
    event.respondWith(networkOnly(request));
  }
});

/**
 * Check if URL is a static asset
 */
function isStaticAsset(url) {
  const staticExtensions = ['.html', '.css', '.js', '.png', '.jpg', '.svg', '.ico', '.woff', '.woff2'];
  return staticExtensions.some(ext => url.pathname.endsWith(ext)) ||
         url.pathname === '/' ||
         url.pathname === '/admin';
}

/**
 * Check if URL is a cacheable API endpoint
 */
function isCacheableApi(url) {
  return CACHEABLE_APIS.some(api => url.pathname.startsWith(api));
}

/**
 * Check if URL is a transit data API
 */
function isTransitApi(url) {
  return url.pathname.includes('/api/departures') ||
         url.pathname.includes('/api/journey') ||
         url.pathname.includes('/api/route') ||
         url.pathname.includes('/api/screen');
}

/**
 * Cache-first strategy for static assets
 */
async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) {
    // Return cached response but update cache in background
    updateCache(request);
    return cached;
  }

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    console.log('[ServiceWorker] Cache-first fetch failed:', error);
    return new Response('Offline - Static asset not cached', { status: 503 });
  }
}

/**
 * Network-first with cache fallback for API requests
 */
async function networkFirstWithCache(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(DATA_CACHE);
      // Add timestamp to cached response
      const responseToCache = response.clone();
      const headers = new Headers(responseToCache.headers);
      headers.set('X-Cached-At', Date.now().toString());

      cache.put(request, new Response(await responseToCache.blob(), {
        status: responseToCache.status,
        statusText: responseToCache.statusText,
        headers
      }));
    }
    return response;
  } catch (error) {
    console.log('[ServiceWorker] Network failed, trying cache:', request.url);
    const cached = await caches.match(request);
    if (cached) {
      // Add header to indicate this is cached data
      const headers = new Headers(cached.headers);
      headers.set('X-From-Cache', 'true');
      const cachedAt = headers.get('X-Cached-At');
      if (cachedAt) {
        const age = Math.floor((Date.now() - parseInt(cachedAt)) / 1000);
        headers.set('X-Cache-Age', age.toString());
      }
      return new Response(await cached.blob(), {
        status: cached.status,
        statusText: cached.statusText,
        headers
      });
    }
    return offlineResponse();
  }
}

/**
 * Network-first with fallback data for transit APIs
 */
async function networkFirstWithFallback(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(DATA_CACHE);
      const headers = new Headers(response.headers);
      headers.set('X-Cached-At', Date.now().toString());

      cache.put(request, new Response(await response.clone().blob(), {
        status: response.status,
        statusText: response.statusText,
        headers
      }));
    }
    return response;
  } catch (error) {
    console.log('[ServiceWorker] Transit API failed, checking cache:', request.url);

    // Try cache first
    const cached = await caches.match(request);
    if (cached) {
      const headers = new Headers(cached.headers);
      headers.set('X-From-Cache', 'true');
      const cachedAt = headers.get('X-Cached-At');
      if (cachedAt) {
        const age = Math.floor((Date.now() - parseInt(cachedAt)) / 1000);
        headers.set('X-Cache-Age', age.toString());
      }
      return new Response(await cached.blob(), {
        status: cached.status,
        statusText: cached.statusText,
        headers
      });
    }

    // Return offline fallback response
    return offlineTransitResponse();
  }
}

/**
 * Network-only strategy
 */
async function networkOnly(request) {
  try {
    return await fetch(request);
  } catch (error) {
    return offlineResponse();
  }
}

/**
 * Update cache in background
 */
async function updateCache(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, response);
    }
  } catch (error) {
    // Ignore errors during background cache update
  }
}

/**
 * Generic offline response
 */
function offlineResponse() {
  return new Response(JSON.stringify({
    success: false,
    offline: true,
    message: 'You are currently offline. Some features may be unavailable.',
    timestamp: new Date().toISOString()
  }), {
    status: 503,
    headers: {
      'Content-Type': 'application/json',
      'X-Offline': 'true'
    }
  });
}

/**
 * Offline response for transit data
 */
function offlineTransitResponse() {
  return new Response(JSON.stringify({
    success: false,
    offline: true,
    message: 'Transit data unavailable offline. Showing cached schedules.',
    fallback: true,
    data: {
      departures: [],
      cached: true,
      stale: true
    },
    timestamp: new Date().toISOString()
  }), {
    status: 503,
    headers: {
      'Content-Type': 'application/json',
      'X-Offline': 'true',
      'X-Fallback': 'true'
    }
  });
}

/**
 * Handle messages from the main thread
 */
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data && event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((name) => caches.delete(name))
        );
      }).then(() => {
        event.ports[0].postMessage({ success: true });
      })
    );
  }

  if (event.data && event.data.type === 'GET_CACHE_STATUS') {
    event.waitUntil(
      getCacheStatus().then((status) => {
        event.ports[0].postMessage(status);
      })
    );
  }
});

/**
 * Get cache status for UI display
 */
async function getCacheStatus() {
  const status = {
    static: { size: 0, entries: 0 },
    data: { size: 0, entries: 0 },
    total: { size: 0, entries: 0 }
  };

  try {
    const staticCache = await caches.open(STATIC_CACHE);
    const staticKeys = await staticCache.keys();
    status.static.entries = staticKeys.length;

    const dataCache = await caches.open(DATA_CACHE);
    const dataKeys = await dataCache.keys();
    status.data.entries = dataKeys.length;

    status.total.entries = status.static.entries + status.data.entries;
  } catch (error) {
    console.error('[ServiceWorker] Error getting cache status:', error);
  }

  return status;
}

/**
 * Background sync for queued requests
 */
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-preferences') {
    event.waitUntil(syncPreferences());
  }
});

/**
 * Sync preferences when back online
 */
async function syncPreferences() {
  // This would sync any queued preference changes
  console.log('[ServiceWorker] Syncing preferences...');
  // Implementation would go here
}

console.log('[ServiceWorker] Loaded - PTV-TRMNL Offline Support v1.0');
