const CACHE_NAME = 'gmlhub-shell-__BUILD_VERSION__'
const APP_SHELL = __APP_SHELL__
const ASSET_URLS = new Set(APP_SHELL.map(path => new URL(path, self.location.origin).href))

async function cleanOldCaches() {
  const active = self.registration.active
  const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
  const current = await Promise.all(clients.map(client => new Promise((resolve) => {
    const channel = new MessageChannel()
    const finish = (value) => {
      clearTimeout(timeout)
      channel.port1.close()
      resolve(value)
    }
    const timeout = setTimeout(() => finish(false), 1000)
    channel.port1.onmessage = (event) => {
      const urls = event.data
      finish(Array.isArray(urls) && urls.length > 0 && urls.every(url => ASSET_URLS.has(url)))
    }
    try {
      client.postMessage({ type: 'GET_PAGE_ASSETS' }, [channel.port2])
    } catch {
      finish(false)
    }
  })))
  if (current.some(value => !value)) return
  const remaining = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
  if (remaining.some(client => !clients.some(known => known.id === client.id))) return
  const keys = await caches.keys()
  if (self.registration.active !== active || self.registration.installing || self.registration.waiting) return
  await Promise.all(keys.filter(key => key.startsWith('gmlhub-shell-') && key !== CACHE_NAME)
    .map(key => caches.delete(key)))
}

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME)
    try {
      await cache.addAll(APP_SHELL.map(path => new Request(path, { cache: 'reload' })))
    } catch (error) {
      await caches.delete(CACHE_NAME)
      throw error
    }
    // The legacy page has no update prompt; migrate its worker without reloading the page.
    const keys = await caches.keys()
    const hasPreviousVersion = keys.some(key => key.startsWith('gmlhub-shell-')
      && key !== 'gmlhub-shell-v1' && key !== CACHE_NAME)
    if (keys.includes('gmlhub-shell-v1') && !hasPreviousVersion) await self.skipWaiting()
  })())
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim().then(cleanOldCaches))
})

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') event.waitUntil(self.skipWaiting())
  if (event.data?.type === 'CLIENT_READY') event.waitUntil(cleanOldCaches())
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return
  // Keep module routes, live diagnostics and its API outside the desktop offline fallback.
  const path = new URL(request.url).pathname
  if (path === '/one-ip' || path.startsWith('/one-ip/')) return

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(new Request(request, { cache: 'no-cache' })).catch(async () => {
        const cache = await caches.open(CACHE_NAME)
        return await cache.match('/') || Response.error()
      }),
    )
    return
  }

  if (!ASSET_URLS.has(request.url) && !new URL(request.url).pathname.startsWith('/assets/')) return
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME)
    const cached = await cache.match(request)
    if (cached) return cached
    // Other tabs may still import hashed chunks from a previous release.
    const keys = await caches.keys()
    for (const key of keys.filter(key => key.startsWith('gmlhub-shell-') && key !== CACHE_NAME)) {
      const previous = await (await caches.open(key)).match(request)
      if (previous) return previous
    }
    return fetch(request)
  })())
})
