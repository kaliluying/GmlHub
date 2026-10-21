// @vitest-environment node
import { createHash } from 'node:crypto'
import { mkdtemp, mkdir, readFile, writeFile, rm, symlink } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'
import { runInNewContext } from 'node:vm'
import { describe, expect, it } from 'vitest'
import { oneIpModule } from './one-ip-vite.js'

describe('one-ip integration build', () => {
  it('allows our same-origin iframe, blocks cross-origin framing, and matches the CSP hash', async () => {
    const html = await readFile('modules/one-ip/index.html', 'utf8')
    const script = html.match(/<script>([\s\S]*?)<\/script>/)[1]
    const headers = await readFile('modules/one-ip/public/_headers', 'utf8')
    const workerSource = await readFile('server/one-ip-worker.js', 'utf8')
    expect(workerSource).toContain(headers.split('\n').find(line => line.trim().startsWith('Content-Security-Policy:')).trim().slice('Content-Security-Policy: '.length))
    expect(headers).toContain(`sha256-${createHash('sha256').update(script).digest('base64')}`)
    for (const sameOrigin of [true, false]) {
      const root = { className: '', classList: { toggle() {} }, style: {} }
      runInNewContext(script, {
        document: { documentElement: root }, navigator: { userAgent: 'Chromium' },
        window: { self: {}, top: { location: { origin: sameOrigin ? 'https://gmlhub.test' : 'https://other.test' } }, location: { origin: 'https://gmlhub.test' }, matchMedia: () => ({ matches: false }) },
        localStorage: { getItem: () => null },
      })
      expect(root.className).toBe(sameOrigin ? '' : 'embedded-browser')
    }
  })

  it('ships actual modified source and excludes local credentials, dependencies and symlinks', async () => {
    const root = await mkdtemp(join(tmpdir(), 'gmlhub-source-'))
    try {
      for (const path of ['modules/one-ip/dist', 'src', 'server', 'scripts/__pycache__', 'public', 'docs', 'modules/one-ip/node_modules']) await mkdir(join(root, path), { recursive: true })
      const names = ['package.json', 'pnpm-lock.yaml', 'vite.config.js', 'tailwind.config.js', 'postcss.config.js', 'index.html', 'wrangler.toml', 'README.md', 'THIRD_PARTY_NOTICES.md', 'src/modified.js', 'server/.dev.vars.example', 'modules/one-ip/LICENSE', 'modules/one-ip/dist/index.html', 'server/.dev.vars', 'src/.env.local', 'modules/one-ip/.secrets.local.env', 'modules/one-ip/node_modules/private.js', 'scripts/__pycache__/private.pyc']
      for (const name of names) await writeFile(join(root, name), 'fixture')
      await symlink(join(root, 'server/.dev.vars'), join(root, 'src/secret-link'))
      const plugin = oneIpModule()
      plugin.configResolved({ root, build: { outDir: 'dist' } })
      await plugin.writeBundle()
      const result = spawnSync('tar', ['-tzf', join(root, 'dist/one-ip/source.tar.gz')], { encoding: 'utf8' })
      expect(result.status).toBe(0)
      const paths = result.stdout.trim().split('\n')
      expect(paths).toContain('src/modified.js')
      expect(paths).toContain('modules/one-ip/LICENSE')
      expect(paths).toContain('server/.dev.vars.example')
      expect(paths).not.toContain('server/.dev.vars')
      expect(paths).not.toContain('src/secret-link')
      expect(paths.some(path => path.includes('/node_modules/') || path.includes('/dist/') || path.includes('/__pycache__/') || path.includes('.env.local') || path.includes('.secrets.'))).toBe(false)
    } finally { await rm(root, { recursive: true, force: true }) }
  })
})
