// @vitest-environment node
import { spawn } from 'node:child_process'
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'
import { expect, it } from 'vitest'

it.skipIf(process.platform === 'win32')('cleans stubborn descendants after their pnpm wrappers exit', async () => {
  const folder = await mkdtemp(join(tmpdir(), 'gmlhub-dev-'))
  const ready = join(folder, 'ready')
  let launcher
  let pids = []
  const isAlive = (pid) => { try { process.kill(pid, 0); return true } catch { return false } }
  try {
    await mkdir(join(folder, 'bin'))
    const fakePnpm = `#!${process.execPath}
import { spawn } from 'node:child_process'
const code = "const fs = require('node:fs'); process.on('SIGTERM', () => {}); fs.appendFileSync(process.env.GMLHUB_TEST_READY, process.pid + String.fromCharCode(10)); setInterval(() => {}, 1000)"
spawn(process.execPath, ['-e', code], { stdio: 'ignore' })
process.on('SIGTERM', () => process.exit(0))
setInterval(() => {}, 1000)
`
    await writeFile(join(folder, 'bin/pnpm'), fakePnpm, { mode: 0o755 })
    launcher = spawn(process.execPath, [resolve('scripts/dev.mjs')], {
      stdio: 'ignore',
      env: { ...process.env, PATH: `${folder}/bin:${process.env.PATH}`, GMLHUB_TEST_READY: ready },
    })
    const exited = new Promise(resolve => launcher.on('exit', resolve))
    for (let attempt = 0; attempt < 100; attempt += 1) {
      pids = (await readFile(ready, 'utf8').catch(() => '')).trim().split('\n').filter(Boolean).map(Number)
      if (pids.length === 3) break
      await delay(30)
    }
    expect(pids).toHaveLength(3)
    launcher.kill('SIGTERM')
    expect(await exited).toBe(0)
    for (let attempt = 0; attempt < 20 && pids.some(isAlive); attempt += 1) await delay(50)
    expect(pids.filter(isAlive)).toEqual([])
  } finally {
    launcher?.kill('SIGKILL')
    for (const pid of pids) { try { process.kill(pid, 'SIGKILL') } catch {} }
    await rm(folder, { recursive: true, force: true })
  }
}, 15000)
