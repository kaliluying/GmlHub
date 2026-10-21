// @vitest-environment node
import { createServer } from 'vite'
import { resolve } from 'node:path'
import { expect, it } from 'vitest'

it('does not serve Worker credentials through source or filesystem URLs', async () => {
  const server = await createServer({
    configFile: resolve('vite.config.js'),
    logLevel: 'silent',
    server: { host: '127.0.0.1', port: 0, hmr: false },
  })
  try {
    await server.listen()
    const origin = `http://127.0.0.1:${server.httpServer.address().port}`
    // The blank example has the same private filename pattern without containing a secret.
    for (const path of ['/server/.dev.vars.example', `/@fs/${resolve('server/.dev.vars.example')}`]) {
      const response = await fetch(origin + path)
      expect(response.status).toBe(403)
    }
  } finally { await server.close() }
}, 15000)
