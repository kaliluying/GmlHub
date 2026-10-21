// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'
import worker from './one-ip-worker.js'

const origin = 'https://gmlhub.test'
const request = (path, init) => new Request(`${origin}${path}`, init)

describe('one-ip mount and security boundaries', () => {
  it('exposes the deployed code revision without caching or accepting cross-origin calls', async () => {
    const env = { RELEASE_SHA: 'a'.repeat(40) }
    const response = await worker.fetch(request('/one-ip/api/deployment'), env)
    expect(await response.json()).toEqual({ commit: env.RELEASE_SHA })
    expect(response.headers.get('Cache-Control')).toBe('no-store')
    expect((await worker.fetch(request('/one-ip/api/deployment', { method: 'POST' }), env)).status).toBe(405)
    expect((await worker.fetch(request('/one-ip/api/deployment', { headers: { Origin: 'https://other.test' } }), env)).status).toBe(403)
  })
  it('mounts upstream APIs and preserves same-origin checks', async () => {
    const response = await worker.fetch(request('/one-ip/api/browser/challenges'), {})
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual(expect.arrayContaining([expect.objectContaining({ configured: false })]))
    const denied = await worker.fetch(request('/one-ip/api/browser/challenges', { headers: { Origin: 'https://other.test' } }), {})
    expect(denied.status).toBe(403)
    const allowed = await worker.fetch(request('/one-ip/api/browser/challenges', { headers: { Origin: origin } }), {})
    expect(allowed.status).toBe(200)
  })

  it('retains local IP honesty, input validation, captcha and rate limits', async () => {
    expect((await worker.fetch(request('/one-ip/api/me'), { LOCAL_DEV: 'true' })).status).toBe(503)
    expect((await worker.fetch(request('/one-ip/api/ip/health'), { LOCAL_DEV: 'true' })).status).toBe(503)
    expect((await worker.fetch(request('/one-ip/api/ip/health?ip=127.0.0.1'), {})).status).toBe(400)
    expect((await worker.fetch(request('/one-ip/api/ping/start', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' }), {})).status).toBe(403)
    expect((await worker.fetch(request('/one-ip/api/browser/challenges'), { API_LIMITER: { limit: async () => ({ success: false }) } })).status).toBe(429)
  })

  it('blocks backend source, including both mount locations', async () => {
    const fetch = vi.fn()
    for (const path of ['/worker', '/worker/index.js', '/one-ip/worker', '/one-ip/worker/http.js']) {
      expect((await worker.fetch(request(path), { ASSETS: { fetch } })).status).toBe(404)
    }
    expect(fetch).not.toHaveBeenCalled()
  })

  it('prevents proxy payload rewriting while preserving asset caching and bytes', async () => {
    const body = '<html>network diagnostics</html>'
    const fetch = async () => new Response(body, { headers: { 'Cache-Control': 'public, max-age=0, must-revalidate' } })
    const env = { ASSETS: { fetch } }
    const response = await worker.fetch(request('/one-ip/index.html'), env)
    expect(await response.text()).toBe(body)
    expect(response.headers.get('Cache-Control')).toBe('public, max-age=0, must-revalidate, no-transform')
    const desktop = await worker.fetch(request('/index.html'), env)
    expect(desktop.headers.get('Cache-Control')).toBe('public, max-age=0, must-revalidate')
  })

  it('serves nested navigation including dotted IPv4 details from its own index', async () => {
    const fetch = vi.fn(async (req) => new URL(req.url).pathname === '/one-ip/index.html'
      ? new Response('one-ip app', { headers: { 'Content-Type': 'text/html' } })
      : new Response('missing', { status: 404 }))
    const response = await worker.fetch(request('/one-ip/network/ip/1.1.1.1', { headers: { Accept: 'text/html' } }), { ASSETS: { fetch } })
    expect(await response.text()).toBe('one-ip app')
    expect(response.headers.get('X-Frame-Options')).toBe('SAMEORIGIN')
    expect(response.headers.get('Content-Security-Policy')).toContain("frame-ancestors 'self'")
    const missing = await worker.fetch(request('/one-ip/assets/missing.js'), { ASSETS: { fetch } })
    expect(missing.status).toBe(404)
    expect((await worker.fetch(request('/one-ip?lang=en'), { ASSETS: { fetch } })).headers.get('Location')).toBe(`${origin}/one-ip/?lang=en`)
  })
})
