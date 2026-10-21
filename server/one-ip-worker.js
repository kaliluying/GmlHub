import oneIp from '../modules/one-ip/public/worker/index.js'

const prefix = '/one-ip'
const contentSecurityPolicy = "default-src 'self'; script-src 'self' 'sha256-y+Q9sKR1l8uAp3GoUy5UBfrRmN/10qjnNcUrE0+7AJI=' https://challenges.cloudflare.com https://www.google.com/recaptcha/ https://www.gstatic.com/recaptcha/; script-src-attr 'none'; style-src 'self' 'unsafe-inline'; connect-src 'self' https:; img-src 'self' https: data: blob:; font-src 'self' data:; frame-src 'self' about: https://challenges.cloudflare.com https://www.google.com/recaptcha/ https://recaptcha.google.com/recaptcha/ https://openspeedtest.com; worker-src 'self'; object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'self'"

export default {
  async fetch(request, env) {
    const url = new URL(request.url)
    if (/^\/(?:one-ip\/)?worker(?:\/|$)/.test(url.pathname)) {
      return new Response('Not found', { status: 404 })
    }
    if (url.pathname === `${prefix}/api/deployment`) {
      const origin = request.headers.get('Origin')
      if (origin && origin !== url.origin) return new Response('Forbidden', { status: 403 })
      if (request.method !== 'GET') return new Response('Method not allowed', { status: 405 })
      return Response.json({ commit: env.RELEASE_SHA || null }, { headers: { 'Cache-Control': 'no-store' } })
    }
    if (url.pathname.startsWith(`${prefix}/api/`)) {
      url.pathname = url.pathname.slice(prefix.length)
      // Keep the original origin and trusted Cloudflare request metadata.
      return oneIp.fetch(new Request(url, request), env)
    }
    if (!env.ASSETS) return new Response('Not found', { status: 404 })
    if (url.pathname === prefix) {
      url.pathname += '/'
      return Response.redirect(url, 308)
    }
    let response = await env.ASSETS.fetch(request)
    const isModule = url.pathname.startsWith(`${prefix}/`)
    const isPage = request.headers.get('Accept')?.includes('text/html') || !url.pathname.split('/').pop().includes('.')
    if (response.status === 404 && isPage && !url.pathname.startsWith(`${prefix}/assets/`)) {
      url.pathname = isModule ? `${prefix}/index.html` : '/index.html'
      response = await env.ASSETS.fetch(new Request(url, request))
    }
    if (!isModule) return response
    const headers = new Headers(response.headers)
    headers.set('Content-Security-Policy', contentSecurityPolicy)
    headers.set('X-Frame-Options', 'SAMEORIGIN')
    headers.set('X-Content-Type-Options', 'nosniff')
    headers.set('Referrer-Policy', 'no-referrer')
    return new Response(response.body, { status: response.status, statusText: response.statusText, headers })
  },
}
