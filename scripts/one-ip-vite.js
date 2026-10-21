import { cp, readFile, readdir, mkdir, writeFile, stat } from 'node:fs/promises'
import { resolve } from 'node:path'
import { spawnSync } from 'node:child_process'

export const oneIpProxy = {
  '/one-ip/api/': {
    target: 'http://127.0.0.1:8787',
    changeOrigin: false,
  },
}

async function sourceArchive(root) {
  // Distribute the actual modified sources, never local secrets or installed dependencies.
  const files = []
  const ignored = new Set(['node_modules', 'dist', '__pycache__', '.git', '.wrangler', '.worker-test', '.worker-check'])
  async function collect(path) {
    for (const entry of await readdir(resolve(root, path), { withFileTypes: true })) {
      if (ignored.has(entry.name) || entry.name.startsWith('.env') || (entry.name.startsWith('.dev.vars') && entry.name !== '.dev.vars.example') || entry.name.startsWith('.secrets')) continue
      const relative = `${path}/${entry.name}`
      if (entry.isDirectory()) await collect(relative)
      else if (entry.isFile()) files.push(relative)
    }
  }
  for (const folder of ['modules/one-ip', 'src', 'server', 'scripts', 'public', 'docs']) await collect(folder)
  files.push('package.json', 'pnpm-lock.yaml', 'vite.config.js', 'tailwind.config.js', 'postcss.config.js', 'index.html', 'wrangler.toml', 'README.md', 'THIRD_PARTY_NOTICES.md')
  const result = spawnSync('tar', ['-czf', '-', '--null', '-T', '-'], {
    cwd: root,
    input: Buffer.from(files.join('\0') + '\0'),
    maxBuffer: 16 * 1024 * 1024,
  })
  if (result.error || result.status !== 0) throw new Error(`源码归档失败: ${result.error?.message || result.stderr.toString()}`)
  return result.stdout
}

export function oneIpModule() {
  let config
  return {
    name: 'gmlhub-one-ip',
    configResolved(value) { config = value },
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (new URL(req.url, 'http://localhost').pathname === '/one-ip/source.tar.gz') {
          try {
            const archive = await sourceArchive(config.root)
            res.writeHead(200, { 'Content-Type': 'application/gzip', 'Content-Disposition': 'attachment; filename=source.tar.gz', 'Cache-Control': 'no-store' })
            res.end(archive)
          } catch { res.writeHead(500).end('Source archive unavailable') }
          return
        }
        if (/^\/one-ip\/worker(?:\/|\?|$)/.test(req.url || '')) {
          res.writeHead(404).end('Not found')
        } else next()
      })
    },
    configurePreviewServer(server) {
      // Vite's default SPA fallback belongs to GmlHub; nested tool routes need their own index.
      server.middlewares.use(async (req, res, next) => {
        const path = new URL(req.url, 'http://localhost').pathname
        if (/^\/one-ip\/worker(?:\/|$)/.test(path)) return res.writeHead(404).end('Not found')
        if (!path.startsWith('/one-ip/') || path.startsWith('/one-ip/api/')) return next()
        if (path.startsWith('/one-ip/assets/') || /\.(?:js|css|svg|json|png|jpe?g|gz|txt|woff2?)$/.test(path)) {
          const file = resolve(config.root, config.build.outDir, `.${path}`)
          const exists = await stat(file).then(info => info.isFile(), () => false)
          return exists ? next() : res.writeHead(404).end('Not found')
        }
        try {
          const html = await readFile(resolve(config.root, config.build.outDir, 'one-ip/index.html'))
          res.setHeader('Content-Type', 'text/html; charset=utf-8')
          res.end(html)
        } catch { next() }
      })
    },
    async writeBundle() {
      const output = resolve(config.root, config.build.outDir, 'one-ip')
      await mkdir(output, { recursive: true })
      await cp(resolve(config.root, 'modules/one-ip/dist'), output, { recursive: true })
      await writeFile(`${output}/source.tar.gz`, await sourceArchive(config.root))
    },
  }
}
