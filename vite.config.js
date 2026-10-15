import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { createHash } from 'node:crypto'
import { readFile, readdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

function serviceWorker() {
  let config
  return {
    name: 'gmlhub-service-worker',
    apply: 'build',
    configResolved(resolved) {
      config = resolved
    },
    async writeBundle() {
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
      const shell = files.map(file => file === 'index.html' ? '/' : `/${file}`)
      await writeFile(resolve(outDir, 'sw.js'), source
        .replace('__BUILD_VERSION__', hash.digest('hex').slice(0, 16))
        .replace('__APP_SHELL__', JSON.stringify(shell)))
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue(), serviceWorker()],
  test: {
    environment: 'jsdom',
    globals: true,
  },
})
