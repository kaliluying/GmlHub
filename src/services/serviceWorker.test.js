// @vitest-environment node
import { readFile } from 'node:fs/promises'
import { runInNewContext } from 'node:vm'
import { describe, expect, it, vi } from 'vitest'

const source = await readFile(new URL('../../public/sw.js', import.meta.url), 'utf8')
const origin = 'https://gmlhub.test'

function createWorker(keys = []) {
  const handlers = {}
  const cache = { addAll: vi.fn().mockResolvedValue(), match: vi.fn() }
  const caches = {
    open: vi.fn().mockResolvedValue(cache),
    keys: vi.fn().mockResolvedValue(keys),
    has: vi.fn(name => Promise.resolve(keys.includes(name))),
    delete: vi.fn().mockResolvedValue(true),
  }
  const self = {
    location: { origin },
    registration: { active: {}, installing: null, waiting: null },
    clients: { claim: vi.fn().mockResolvedValue(), matchAll: vi.fn().mockResolvedValue([]) },
    skipWaiting: vi.fn().mockResolvedValue(),
    addEventListener: (type, handler) => { handlers[type] = handler },
  }
  const fetch = vi.fn()
  class WorkerRequest {
    constructor(input, options = {}) {
      Object.assign(this, typeof input === 'string' ? { url: new URL(input, origin).href } : input, options)
    }
  }
  runInNewContext(source.replace('__BUILD_VERSION__', 'test-version')
    .replace('__APP_SHELL__', JSON.stringify(['/', '/assets/app.js'])), {
    self, caches, fetch, URL, Request: WorkerRequest, Response, MessageChannel, setTimeout, clearTimeout,
  })

  function dispatch(type, data = {}) {
    const work = []
    let response
    handlers[type]({
      ...data,
      waitUntil: promise => work.push(promise),
      respondWith: promise => { response = promise },
    })
    return { done: Promise.all(work), response }
  }
  return { self, cache, caches, fetch, dispatch }
}

describe('service worker cache lifecycle', () => {
  it('leaves module navigations, assets and API requests to the network', () => {
    const worker = createWorker()
    for (const path of ['/one-ip', '/one-ip/network/ip/1.1.1.1', '/one-ip/api/ip/health', '/one-ip/assets/app.js']) {
      expect(worker.dispatch('fetch', { request: { method: 'GET', mode: 'navigate', url: `${origin}${path}` } }).response).toBeUndefined()
    }
    expect(worker.fetch).not.toHaveBeenCalled()
  })
  it('precaches the built shell without activating a normal update', async () => {
    const worker = createWorker()
    await worker.dispatch('install').done
    expect(worker.cache.addAll.mock.calls[0][0].map(request => request.url))
      .toEqual([`${origin}/`, `${origin}/assets/app.js`])
    expect(worker.cache.addAll.mock.calls[0][0].every(request => request.cache === 'reload')).toBe(true)
    expect(worker.self.skipWaiting).not.toHaveBeenCalled()
  })

  it('migrates the legacy worker only after precaching succeeds', async () => {
    const worker = createWorker(['gmlhub-shell-v1'])
    await worker.dispatch('install').done
    expect(worker.self.skipWaiting).toHaveBeenCalledOnce()

    const failed = createWorker(['gmlhub-shell-v1'])
    failed.cache.addAll.mockRejectedValue(new Error('missing bundle'))
    await expect(failed.dispatch('install').done).rejects.toThrow('missing bundle')
    expect(failed.self.skipWaiting).not.toHaveBeenCalled()
    expect(failed.caches.delete).toHaveBeenCalledWith('gmlhub-shell-test-version')
  })

  it('does not auto-activate a normal update when a legacy inflight request recreated its cache', async () => {
    const worker = createWorker(['gmlhub-shell-v1', 'gmlhub-shell-previous'])
    await worker.dispatch('install').done
    expect(worker.self.skipWaiting).not.toHaveBeenCalled()
  })

  it('removes only old GmlHub caches and awaits client takeover', async () => {
    const worker = createWorker(['gmlhub-shell-v1', 'gmlhub-shell-test-version', 'other-app'])
    await worker.dispatch('activate').done
    expect(worker.caches.delete).toHaveBeenCalledExactlyOnceWith('gmlhub-shell-v1')
    expect(worker.self.clients.claim).toHaveBeenCalledOnce()
  })

  it('activates a waiting worker only on the update message', async () => {
    const worker = createWorker()
    await worker.dispatch('message', { data: { type: 'OTHER' } }).done
    expect(worker.self.skipWaiting).not.toHaveBeenCalled()
    await worker.dispatch('message', { data: { type: 'SKIP_WAITING' } }).done
    expect(worker.self.skipWaiting).toHaveBeenCalledOnce()
  })

  it('retains old caches while another page uses old assets, then cleans when all pages update', async () => {
    const worker = createWorker(['gmlhub-shell-old', 'gmlhub-shell-test-version', 'other-app'])
    let pageAssets = [`${origin}/assets/old.js`]
    worker.self.clients.matchAll.mockResolvedValue([{
      postMessage: (_message, ports) => ports[0].postMessage(pageAssets),
    }])
    await worker.dispatch('activate').done
    expect(worker.caches.delete).not.toHaveBeenCalled()
    pageAssets = [`${origin}/assets/app.js`]
    await worker.dispatch('message', { data: { type: 'CLIENT_READY' } }).done
    expect(worker.caches.delete).toHaveBeenCalledExactlyOnceWith('gmlhub-shell-old')
  })

  it('serves a previous release chunk to an old page after another tab updates', async () => {
    const worker = createWorker(['gmlhub-shell-old', 'gmlhub-shell-test-version', 'other-app'])
    const previousCache = { match: vi.fn().mockResolvedValue(new Response('old lazy panel')) }
    worker.caches.open.mockImplementation(name => Promise.resolve(
      name === 'gmlhub-shell-old' ? previousCache : worker.cache,
    ))
    const response = await worker.dispatch('fetch', {
      request: { url: `${origin}/assets/old-panel.js`, method: 'GET' },
    }).response
    expect(await response.text()).toBe('old lazy panel')
    expect(worker.fetch).not.toHaveBeenCalled()
    expect(worker.caches.open).not.toHaveBeenCalledWith('other-app')
  })

  it('keeps old caches if a new unknown tab appears while checking page versions', async () => {
    const worker = createWorker(['gmlhub-shell-old'])
    worker.self.clients.matchAll.mockResolvedValueOnce([]).mockResolvedValueOnce([{ id: 'new-tab' }])
    await worker.dispatch('activate').done
    expect(worker.caches.delete).not.toHaveBeenCalled()
  })

  it('preserves the next release cache while its worker is installing or waiting', async () => {
    for (const state of ['installing', 'waiting']) {
      const worker = createWorker(['gmlhub-shell-next'])
      worker.self.registration[state] = {}
      await worker.dispatch('message', { data: { type: 'CLIENT_READY' } }).done
      expect(worker.caches.delete).not.toHaveBeenCalled()
    }
  })

  it('does not let a superseded worker clean the newly active release', async () => {
    const worker = createWorker(['gmlhub-shell-next'])
    worker.caches.keys.mockImplementation(() => {
      worker.self.registration.active = {}
      return Promise.resolve(['gmlhub-shell-next'])
    })
    await worker.dispatch('message', { data: { type: 'CLIENT_READY' } }).done
    expect(worker.caches.delete).not.toHaveBeenCalled()
  })
})

describe('service worker requests', () => {
  const navigation = { url: `${origin}/?from=bookmark`, mode: 'navigate', method: 'GET' }

  it('uses a revalidated network response for navigation, even with an old cached page', async () => {
    const worker = createWorker()
    worker.cache.match.mockResolvedValue(new Response('old'))
    worker.fetch.mockResolvedValue(new Response('new'))
    const response = await worker.dispatch('fetch', { request: navigation }).response
    expect(await response.text()).toBe('new')
    expect(worker.fetch.mock.calls[0][0].cache).toBe('no-cache')
    expect(worker.cache.match).not.toHaveBeenCalled()
  })

  it('falls back to the installed shell offline, including query URLs', async () => {
    const worker = createWorker()
    worker.fetch.mockRejectedValue(new Error('offline'))
    worker.cache.match.mockResolvedValue(new Response('offline shell'))
    const response = await worker.dispatch('fetch', { request: navigation }).response
    expect(await response.text()).toBe('offline shell')
    expect(worker.caches.open).toHaveBeenCalledWith('gmlhub-shell-test-version')
    expect(worker.cache.match).toHaveBeenCalledWith('/')
  })

  it('serves precached bundles without the network', async () => {
    const worker = createWorker()
    worker.cache.match.mockResolvedValue(new Response('bundle'))
    const response = await worker.dispatch('fetch', {
      request: { url: `${origin}/assets/app.js`, method: 'GET' },
    }).response
    expect(await response.text()).toBe('bundle')
    expect(worker.fetch).not.toHaveBeenCalled()
  })

  it('leaves APIs, cross-origin resources and writes outside the cache', () => {
    const worker = createWorker()
    for (const request of [
      { url: `${origin}/api/private`, method: 'GET' },
      { url: 'https://other.test/assets/app.js', method: 'GET' },
      { url: `${origin}/`, method: 'POST' },
    ]) {
      expect(worker.dispatch('fetch', { request }).response).toBeUndefined()
    }
    expect(worker.caches.open).not.toHaveBeenCalled()
  })
})
