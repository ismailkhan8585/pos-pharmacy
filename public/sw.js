const CACHE_NAME = "anmedcare-pos-v1"
const STATIC_ASSETS = [
  "/",
  "/pos",
  "/login",
  "/manifest.json",
  "/icon-192.png",
  "/icon-512.png",
]

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn("Service worker cache.addAll non-critical warning:", err)
      })
    })
  )
  self.skipWaiting()
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key)
          }
        })
      )
    })
  )
  self.clients.claim()
})

self.addEventListener("fetch", (event) => {
  // Only handle GET requests
  if (event.request.method !== "GET") return

  // Don't intercept Supabase cloud API requests
  const url = new URL(event.request.url)
  if (url.origin.includes("supabase.co")) return

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        // Cache successful responses for same-origin assets
        if (
          networkResponse &&
          networkResponse.status === 200 &&
          url.origin === self.location.origin
        ) {
          const responseToCache = networkResponse.clone()
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache)
          })
        }
        return networkResponse
      })
      .catch(() => {
        // Fallback to cache when offline
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) return cachedResponse
          if (event.request.mode === "navigate") {
            return caches.match("/pos")
          }
          return new Response("Offline", { status: 503, statusText: "Service Unavailable" })
        })
      })
  )
})
