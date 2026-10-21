import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { createHash } from 'node:crypto'
import { readFile, readdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { oneIpModule, oneIpProxy } from './scripts/one-ip-vite.js'

function serviceWorker() {
  let config
  return {
    name: 'gmlhub-service-worker',
    apply: 'build',
    configResolved(resolved) {
      config = resolved
    },
    writeBundle: {
      order: 'post',
      sequential: true,
      async handler() {
        const outDir = resolve(config.root, config.build.outDir)
        const entries = await readdir(outDir, { recursive: true, withFileTypes: true })
        const files = entries.filter(entry => entry.isFile() && entry.name !== 'sw.js')
          .map(entry => resolve(entry.parentPath, entry.name).slice(outDir.length + 1))
          .sort()
        const source = await readFile(resolve(config.publicDir, 'sw.js'), 'utf8')
        const hash = createHash('sha256').update(source)
        for (const file of files) {
          hash.update(file).update(await readFile(resolve(outDir, file)))
        }
        // Network diagnostics need live requests; keep the multi-megabyte module out of shell precaching.
        const shell = files.filter(file => !file.startsWith('one-ip/')).map(file => file === 'index.html' ? '/' : `/${file}`)
        await writeFile(resolve(outDir, 'sw.js'), source
          .replace('__BUILD_VERSION__', hash.digest('hex').slice(0, 16))
          .replace('__APP_SHELL__', JSON.stringify(shell)))
      },
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue(), oneIpModule(), serviceWorker()],
  server: {
    fs: {
      deny: ['.env', '.env.*', '*.{crt,pem,key,p12,pfx,cer,der}', '.npmrc', '.yarnrc.yml', '**/.git/**', '**/.dev.vars*', '**/.secrets*'],
    },
    proxy: {
      ...oneIpProxy,
      '/one-ip': { target: 'http://127.0.0.1:5137', changeOrigin: false, ws: true },
    },
  },
  preview: { proxy: oneIpProxy },
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['src/**/*.test.js', 'server/**/*.test.js', 'scripts/**/*.test.js'],
  },
})
