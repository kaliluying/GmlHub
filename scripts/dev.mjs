import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'

if (!existsSync('modules/one-ip/node_modules/.bin/vite')) {
  console.error('请先运行 pnpm run setup:one-ip 安装网络工具箱依赖。')
  process.exit(1)
}

const children = new Set()
let stopping = false

function stop(code) {
  if (stopping) return
  stopping = true
  process.exitCode = code
  for (const child of children) signal(child, 'SIGTERM')
  // Keep group handles and the deadline alive even if pnpm exits before its descendants.
  setTimeout(() => {
    for (const child of children) signal(child, 'SIGKILL')
  }, 5000)
}

function signal(child, value) {
  if (!child.pid) return
  try {
    if (process.platform === 'win32') child.kill(value)
    else process.kill(-child.pid, value)
  } catch (error) {
    if (error.code !== 'ESRCH') console.error(error.message)
  }
}

function start(args, cwd = process.cwd()) {
  const child = spawn('pnpm', args, {
    cwd,
    stdio: 'inherit',
    detached: process.platform !== 'win32',
    env: { ...process.env, WRANGLER_SEND_METRICS: 'false' },
  })
  children.add(child)
  child.on('error', (error) => {
    console.error(error.message)
    stop(1)
  })
  child.on('exit', (code) => {
    if (!stopping) stop(code || 1)
  })
}

process.on('SIGINT', () => stop(0))
process.on('SIGTERM', () => stop(0))
start(['exec', 'vite', '--host', '127.0.0.1', '--strictPort', ...process.argv.slice(2)])
start(['exec', 'vite'], new URL('../modules/one-ip/', import.meta.url))
start(['run', 'worker:dev'])
