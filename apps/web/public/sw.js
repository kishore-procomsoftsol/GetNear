/**
 * GetNear Service Worker
 * Implements caching strategies for offline support.
 * Requirements: 18.1 (PWA)
 */

const CACHE_NAME = 'getnear-v2'
const FONT_CACHE = 'getnear-fonts-v1'
const IMAGE_CACHE = 'getnear-images-v1'

const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/search',
  '/saved',
  '/account',
  '/login',
  '/offline',
]

// Offline fallback HTML
const OFFLINE_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Offline — GetNear</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; background: #f9fafb; padding: 1rem; }
    .container { text-align: center; max-width: 320px; }
    .emoji { font-size: 3.5rem; margin-bottom: 1rem; }
    h1 { font-size: 1.25rem; color: #111827; margin-bottom: 0.5rem; }
    p { font-size: 0.875rem; color: #6b7280; margin-bottom: 1.5rem; line-height: 1.5; }
    button { padding: 0.625rem 1.25rem; border-radius: 0.75rem; border: none; background: #2563eb; color: white; font-size: 0.875rem; font-weight: 600; cursor: pointer; }
    button:hover { background: #1d4ed8; }
  </style>
</head>
<body>
  <div class="container">
    <div class="emoji">📡</div>
    <h1>You're offline</h1>
    <p>It looks like you've lost your internet connection. Please check your network and try again.</p>
    <button onclick="window.location.reload()">Retry</button>
  </div>
</body>
</html>`

// Install — cache static assets and offline page
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Cache the offline fallback as a special entry
      cache.put(
        new Request('/_offline'),
        new Response(OFFLINE_HTML, {
          headers: { 'Content-Type': 'text/html' },
        })
      )
      return cache.addAll(STATIC_ASSETS)
    })
  )
  self.skipWaiting()
})

// Activate — clean old caches
self.addEventListener('activate', (event) => {
  const VALID_CACHES = [CACHE_NAME, FONT_CACHE, IMAGE_CACHE]
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => !VALID_CACHES.includes(k))
          .map((k) => caches.delete(k))
      )
    )
  )
  self.clients.claim()
})

// Fetch — different strategies per resource type
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Skip non-GET requests
  if (request.method !== 'GET') return

  // API requests — network only (don't cache dynamic data)
  if (url.pathname.startsWith('/api/')) return

  // Google Fonts — cache-first (fonts rarely change)
  if (
    url.hostname === 'fonts.googleapis.com' ||
    url.hostname === 'fonts.gstatic.com'
  ) {
    event.respondWith(
      caches.open(FONT_CACHE).then(async (cache) => {
        const cached = await cache.match(request)
        if (cached) return cached
        const response = await fetch(request)
        if (response.ok) cache.put(request, response.clone())
        return response
      })
    )
    return
  }

  // Supabase Storage images — stale-while-revalidate
  if (
    url.hostname.includes('supabase') &&
    (url.pathname.includes('/storage/') || url.pathname.includes('/object/'))
  ) {
    event.respondWith(
      caches.open(IMAGE_CACHE).then(async (cache) => {
        const cached = await cache.match(request)
        const fetchPromise = fetch(request)
          .then((response) => {
            if (response.ok) cache.put(request, response.clone())
            return response
          })
          .catch(() => cached)

        return cached || fetchPromise
      })
    )
    return
  }

  // Static assets & pages — stale-while-revalidate with offline fallback
  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cached = await cache.match(request)
      const fetchPromise = fetch(request)
        .then((response) => {
          if (response.ok) cache.put(request, response.clone())
          return response
        })
        .catch(async () => {
          // Network failed — return cached version or offline page
          if (cached) return cached
          // For navigation requests, show offline page
          if (request.mode === 'navigate') {
            const offlinePage = await cache.match('/_offline')
            if (offlinePage) return offlinePage
          }
          return new Response('Offline', { status: 503 })
        })

      return cached || fetchPromise
    })
  )
})

// Push notification handler
self.addEventListener('push', (event) => {
  if (!event.data) return
  const data = event.data.json()
  event.waitUntil(
    self.registration.showNotification(data.title || 'GetNear', {
      body: data.body || '',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      data: data.data || {},
    })
  )
})

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(
    self.clients.openWindow(event.notification.data?.url || '/')
  )
})
