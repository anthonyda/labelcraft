/*
 * labelcraft service worker (spec R30.AC3): keeps the site's own files so
 * the installed app opens offline. Network first, so a new version shows on
 * the next start when online; the kept copy is only a fallback.
 */
const CACHE = 'labelcraft-v1'

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (event) =>
  event.waitUntil(self.clients.claim()),
)

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  // Only the site's own files.
  if (url.origin !== self.location.origin) return
  if (!url.pathname.startsWith(new URL(self.registration.scope).pathname)) {
    return
  }
  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok && res.type === 'basic') {
          const copy = res.clone()
          event.waitUntil(caches.open(CACHE).then((c) => c.put(req, copy)))
        }
        return res
      })
      .catch(async () => {
        const kept = await caches.match(req, { ignoreSearch: true })
        if (kept) return kept
        // Offline start: the page itself.
        if (req.mode === 'navigate') {
          const page = await caches.match(
            new URL('./', self.registration.scope).href,
          )
          if (page) return page
        }
        return Response.error()
      }),
  )
})
