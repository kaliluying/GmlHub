<template>
  <div class="terminal-root" :class="[terminalThemeClass, terminalSizeClass, { 'mode-panic': panicMode }]" @click="focusInput">
    <div ref="outputRef" class="terminal-output">
      <div v-for="(line, index) in lines" :key="`line-${index}`" class="terminal-line" :class="`line-${line.kind}`">
        <span v-if="line.kind === 'command'" class="terminal-prefix">{{ prompt }}</span>
        <span>{{ line.text }}</span>
      </div>
    </div>

    <form class="terminal-input-row" @submit.prevent="handleSubmit">
      <span class="terminal-prefix">{{ prompt }}</span>
      <input
        ref="inputRef"
        v-model="command"
        type="text"
        class="terminal-input"
        spellcheck="false"
        autocomplete="off"
        @keydown.tab.prevent="handleTabComplete"
        @keydown.up.prevent="historyUp"
        @keydown.down.prevent="historyDown"
      />
    </form>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue'
import { useDesktopStore } from '../../stores/desktop.js'
import { useVirtualFsStore } from '../../stores/virtualFs.js'

const store = useDesktopStore()
const fsStore = useVirtualFsStore()

const props = defineProps({
  windowId: {
    type: String,
    default: '',
  },
})

const lines = ref([
  { kind: 'info', text: 'GML Portal Terminal v0.1' },
  { kind: 'info', text: '输入 help 查看可用命令（模拟数据模式）' },
])
const command = ref('')
const commandHistory = ref([])
const historyCursor = ref(-1)
const theme = ref('cyber')
const cwd = ref('/home/gml')
const previousCwd = ref('/home/gml')
const panicMode = ref(false)
const dangerRmStreak = ref(0)
const inputRef = ref(null)
const outputRef = ref(null)
let panicTimer = null

const terminalThemeClass = computed(() => `theme-${theme.value}`)
const terminalSizeClass = computed(() => `font-${store.settings.terminalFontSize || 'medium'}`)
const baseCommands = [
  'help', 'open', 'status', 'theme', 'clear',
  'pwd', 'ls', 'cd', 'cat', 'whoami', 'uname',
  'date', 'uptime', 'ip', 'ifconfig', 'ping',
  'curl', 'ps', 'df', 'free', 'history', 'echo', 'head', 'tail', 'grep', 'wc', 'mkdir', 'touch', 'rm', 'exit',
]
const commandAliases = {
  ll: 'ls',
  la: 'ls',
  dir: 'ls',
  cls: 'clear',
}
const availableCommands = [...baseCommands, ...Object.keys(commandAliases)]

const parseArgs = (raw = '') => raw.trim().split(/\s+/).filter(Boolean)

const isRootDangerousRmAttempt = (rawTarget = '') => {
  const args = parseArgs(rawTarget)
  if (!args.length) return false

  const flags = new Set()
  let pathArg = ''

  for (const arg of args) {
    if (arg.startsWith('-') && !pathArg) {
      for (const flag of arg.slice(1)) {
        if (flag !== 'r' && flag !== 'f') return false
        flags.add(flag)
      }
      continue
    }

    if (pathArg) return false
    pathArg = arg
  }

  return flags.has('r') && flags.has('f') && resolvePath(pathArg) === '/'
}

const triggerPanicMode = async () => {
  panicMode.value = true
  await pushLine('panic', '[PANIC MODE] kernel firewall engaged')
  await pushLine('panic', '[PANIC MODE] destructive syscalls sandboxed')
  await pushLine('panic', '[PANIC MODE] breathe. nothing was harmed :)')

  if (panicTimer) {
    clearTimeout(panicTimer)
    panicTimer = null
  }

  panicTimer = setTimeout(() => {
    panicMode.value = false
    panicTimer = null
  }, 7000)
}

const handleSudo = async (rawTarget) => {
  const payload = rawTarget.trim()
  if (payload !== 'i-am-sure') {
    await pushLine('error', 'sudo: simulated terminal has no real privilege escalation')
    return
  }

  if (!panicMode.value) {
    await pushLine('info', 'sudo: system stable, no override needed')
    return
  }

  panicMode.value = false
  dangerRmStreak.value = 0
  if (panicTimer) {
    clearTimeout(panicTimer)
    panicTimer = null
  }

  await pushLine('success', '[OVERRIDE ACCEPTED] panic mode disabled by operator')
  await pushLine('success', '>> trust channel re-synced // welcome back')
}

const pushLine = async (kind, text) => {
  lines.value.push({ kind, text })
  await nextTick()
  if (outputRef.value) {
    outputRef.value.scrollTop = outputRef.value.scrollHeight
  }
}

const focusInput = () => {
  inputRef.value?.focus()
}

const prompt = computed(() => {
  const displayPath = cwd.value.startsWith('/home/gml')
    ? `~${cwd.value.slice('/home/gml'.length) || ''}`
    : cwd.value
  return `gml@portal:${displayPath}$`
})

const resolvePath = (inputPath) => {
  return fsStore.resolvePath(inputPath, cwd.value)
}

const isDirectory = (path) => fsStore.isDirectory(path)
const listDirectory = (path) => fsStore.listDirectory(path)
const fileExists = (path) => fsStore.fileExists(path)
const getParentPath = (path) => fsStore.getParentPath(path)
const getBaseName = (path) => fsStore.getBaseName(path)
const addEntryToDirectory = (dirPath, name) => fsStore.addEntryToDirectory(dirPath, name)
const removeEntryFromDirectory = (dirPath, name) => fsStore.removeEntryFromDirectory(dirPath, name)
const removeDirectoryTree = (dirPath) => fsStore.removeDirectoryTree(dirPath)

const buildLsLongRow = (name, path) => {
  const fullPath = path === '/' ? `/${name}` : `${path}/${name}`
  const isDir = isDirectory(fullPath)
  const perms = isDir ? 'drwxr-xr-x' : '-rw-r--r--'
  const size = isDir ? 4096 : (fsStore.readFile(fullPath)?.length ?? 128)
  return `${perms} 1 gml gml ${String(size).padStart(5, ' ')} Feb 11 14:34 ${name}`
}

const resolveApp = (query) => {
  const normalized = query.toLowerCase()
  return store.desktopApps.find(app => {
    const id = app.id.toLowerCase()
    const name = app.name.toLowerCase()
    const domain = (app.domain || '').toLowerCase()
    return id === normalized || name === normalized || domain.includes(normalized)
  })
}

const getCommonPrefix = (values) => {
  if (!values.length) return ''
  let prefix = values[0]

  for (let index = 1; index < values.length; index += 1) {
    const current = values[index]
    while (!current.startsWith(prefix) && prefix.length) {
      prefix = prefix.slice(0, -1)
    }
    if (!prefix) break
  }

  return prefix
}

const getAppCandidates = () => {
  const ids = store.desktopApps.map(app => app.id.toLowerCase())
  const unique = [...new Set(ids)]
  return unique.sort((a, b) => a.localeCompare(b, 'en'))
}

const getPathCandidates = (commandName, currentArg = '') => {
  const raw = currentArg || ''

  if (raw === '~') {
    return ['~']
  }

  if (raw.startsWith('~/')) {
    const normalized = raw.endsWith('/') ? raw.slice(0, -1) : raw
    const slashIndex = normalized.lastIndexOf('/')
    const baseInput = slashIndex >= 0 ? normalized.slice(0, slashIndex) : '~'
    const prefix = raw.endsWith('/') ? '' : normalized.slice(slashIndex + 1)
    const entries = listDirectory(resolvePath(baseInput))
    const scoped = commandName === 'cd'
      ? entries.filter(name => isDirectory(resolvePath(`${baseInput}/${name}`)))
      : entries

    return scoped
      .filter(name => name.startsWith(prefix))
      .map(name => `${baseInput}/${name}`)
      .sort((a, b) => a.localeCompare(b, 'en'))
  }

  const hasSlash = raw.includes('/')
  const isAbsoluteTilde = raw === '~' || raw.startsWith('~/')

  let baseInput = ''
  let prefix = raw

  if (hasSlash || isAbsoluteTilde) {
    const normalized = raw.endsWith('/') ? raw.slice(0, -1) : raw
    const slashIndex = normalized.lastIndexOf('/')
    if (slashIndex >= 0) {
      baseInput = normalized.slice(0, slashIndex)
      prefix = normalized.slice(slashIndex + 1)
      if (baseInput === '' && raw.startsWith('/')) baseInput = '/'
      if (baseInput === '' && raw.startsWith('~/')) baseInput = '~'
      if (raw.endsWith('/')) {
        baseInput = normalized || baseInput
        prefix = ''
      }
    }
  }

  const basePath = baseInput ? resolvePath(baseInput) : cwd.value
  const entries = listDirectory(basePath)

  const includeMeta = commandName === 'cd' && !raw
  const baseList = includeMeta ? ['..', '.', ...entries] : entries
  const filtered = baseList.filter(name => name.startsWith(prefix))

  const scoped = commandName === 'cd'
    ? filtered.filter(name => name === '.' || name === '..' || isDirectory(resolvePath(baseInput ? `${baseInput}/${name}` : name)))
    : filtered

  return scoped
    .map((name) => {
      if (!baseInput) return name
      if (baseInput === '/' || baseInput.endsWith('/')) return `${baseInput}${name}`
      return `${baseInput}/${name}`
    })
    .sort((a, b) => a.localeCompare(b, 'en'))
}

const handleTabComplete = async () => {
  const raw = command.value
  const trimmed = raw.trimStart()
  const parts = trimmed.split(/\s+/).filter(Boolean)

  if (!parts.length) {
    command.value = 'help '
    return
  }

  if (parts.length === 1 && !trimmed.includes(' ')) {
    const current = parts[0].toLowerCase()
    const matches = availableCommands.filter(item => item.startsWith(current))
    if (!matches.length) return

    if (matches.length === 1) {
      command.value = `${matches[0]} `
      return
    }

    const prefix = getCommonPrefix(matches)
    if (prefix.length > current.length) {
      command.value = prefix
      return
    }

    await pushLine('info', matches.join('  '))
    return
  }

  const commandName = parts[0].toLowerCase()
  const currentArg = parts.slice(1).join(' ').toLowerCase()

  if (commandName === 'theme') {
    const themeCandidates = ['cyber', 'clean']
    const matches = themeCandidates.filter(item => item.startsWith(currentArg))
    if (!matches.length) return
    const next = matches.length === 1 ? matches[0] : getCommonPrefix(matches)
    command.value = `theme ${next}`
    if (matches.length === 1) command.value += ' '
    return
  }

  if (commandName === 'open' || commandName === 'status') {
    const candidates = commandName === 'status'
      ? ['all', ...getAppCandidates()]
      : getAppCandidates()
    const matches = candidates.filter(item => item.startsWith(currentArg))
    if (!matches.length) return

    if (matches.length === 1) {
      command.value = `${commandName} ${matches[0]} `
      return
    }

    const prefix = getCommonPrefix(matches)
    command.value = `${commandName} ${prefix}`
    if (prefix === currentArg) {
      await pushLine('info', matches.join('  '))
    }
    return
  }

  if (commandName === 'cd' || commandName === 'ls' || commandName === 'cat' || commandName === 'head' || commandName === 'tail' || commandName === 'grep' || commandName === 'wc' || commandName === 'mkdir' || commandName === 'touch' || commandName === 'rm') {
    const candidates = getPathCandidates(commandName, currentArg)
    const matches = candidates.filter(item => item.startsWith(currentArg))
    if (!matches.length) return

    if (matches.length === 1) {
      command.value = `${commandName} ${matches[0]} `
      return
    }

    const prefix = getCommonPrefix(matches)
    command.value = `${commandName} ${prefix}`
    if (prefix === currentArg) {
      await pushLine('info', matches.join('  '))
    }
    return
  }

  if (commandName === 'ping' || commandName === 'curl') {
    const candidates = store.desktopApps.map(app => app.domain).filter(Boolean)
    const matches = candidates.filter(item => item.startsWith(currentArg))
    if (!matches.length) return

    if (matches.length === 1) {
      command.value = `${commandName} ${matches[0]} `
      return
    }

    const prefix = getCommonPrefix(matches)
    command.value = `${commandName} ${prefix}`
  }
}

const handleHelp = async () => {
  await pushLine('info', 'help                 显示命令说明')
  await pushLine('info', 'alias: ll/la/dir      ls 的快捷别名')
  await pushLine('info', 'alias: cls            clear 的快捷别名')
  await pushLine('info', 'open <app>           打开应用，例如 open tools')
  await pushLine('info', 'status [all|app]     查看服务状态')
  await pushLine('info', 'pwd / ls / cd / cat  文件系统模拟命令')
  await pushLine('info', 'ls [-a] [-l] [path]  列出目录（支持组合参数）')
  await pushLine('info', 'whoami / uname / ps   系统信息命令')
  await pushLine('info', 'uname [-a]            输出内核信息')
  await pushLine('info', 'ip / ifconfig         网络信息命令（假数据）')
  await pushLine('info', 'ping [-c N] <host>    连通性测试（假数据）')
  await pushLine('info', 'curl [-I] <url>       请求输出（假数据）')
  await pushLine('info', 'df [-h] / free [-m]   资源状态命令')
  await pushLine('info', 'uptime                运行时长')
  await pushLine('info', 'head/tail [-n N] <f>  查看文件头尾内容')
  await pushLine('info', 'grep <pat> <file>     文件内容检索')
  await pushLine('info', 'wc -l <file>          统计文件行数')
  await pushLine('info', 'mkdir [-p] <dir>      创建目录（会话内）')
  await pushLine('info', 'touch <file>          创建空文件（会话内）')
  await pushLine('info', 'rm [-rf] <path>       删除文件/目录（会话内）')
  await pushLine('info', 'history / echo        历史与输出')
  await pushLine('info', 'exit                  关闭当前终端窗口')
  await pushLine('info', 'theme [cyber|clean]   切换终端主题')
  await pushLine('info', 'clear                 清空终端输出')
}

const handleExit = async () => {
  if (!props.windowId) {
    await pushLine('error', 'exit: current terminal window not found')
    return
  }

  store.closeWindow(props.windowId)
}

const handleOpen = async (target) => {
  if (!target) {
    await pushLine('error', '用法: open <app>')
    return
  }

  const app = resolveApp(target)
  if (!app) {
    await pushLine('error', `未找到应用: ${target}`)
    return
  }

  store.openWindow(app.id)
  await pushLine('success', `已打开 ${app.name}`)
}

const handleStatus = async (target) => {
  await store.checkServiceStatuses()

  if (!target || target === 'all') {
    const { online, offline, total } = store.serviceSummary
    await pushLine('info', `服务概览: total=${total}, online=${online}, offline=${offline}`)
    if (store.lastStatusCheckAt) {
      const checkedAt = new Date(store.lastStatusCheckAt).toLocaleTimeString('zh-CN', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
      await pushLine('info', `最后检测: ${checkedAt}`)
    }
    await pushLine('info', 'APP ID      STATUS      DOMAIN')
    await pushLine('info', '----------------------------------------------')
    for (const app of store.apps) {
      const status = app.status || 'local'
      const row = `${app.id.padEnd(10, ' ')} ${status.padEnd(11, ' ')} ${app.domain || 'local'}`
      await pushLine(`status-${status}`, row)
    }
    return
  }

  const app = resolveApp(target)
  if (!app) {
    await pushLine('error', `未找到应用: ${target}`)
    return
  }

  await pushLine('info', `${app.name}: status=${app.status || 'local'}, domain=${app.domain || 'local'}`)
}

const handleTheme = async (nextTheme) => {
  if (!nextTheme) {
    await pushLine('info', `当前主题: ${theme.value}`)
    return
  }

  if (nextTheme !== 'cyber' && nextTheme !== 'clean') {
    await pushLine('error', '可用主题: cyber, clean')
    return
  }

  theme.value = nextTheme
  await pushLine('success', `主题已切换为 ${nextTheme}`)
}

const handlePwd = async () => {
  await pushLine('info', cwd.value)
}

const handleLs = async (rawTarget) => {
  const args = parseArgs(rawTarget)
  const flags = new Set()
  let pathArg = ''

  for (const arg of args) {
    if (!arg.startsWith('-') || arg === '-') {
      pathArg = arg
      continue
    }

    for (const flag of arg.slice(1)) {
      if (flag !== 'a' && flag !== 'l') {
        await pushLine('error', 'usage: ls [-a] [-l] [path]')
        return
      }
      flags.add(flag)
    }
  }

  const showAll = flags.has('a')
  const longMode = flags.has('l')
  const path = resolvePath(pathArg)

  if (fileExists(path)) {
    const name = path.split('/').filter(Boolean).pop() || path
    if (longMode) {
      await pushLine('info', buildLsLongRow(name, path.slice(0, path.lastIndexOf('/')) || '/'))
      return
    }
    await pushLine('info', name)
    return
  }

  if (!isDirectory(path)) {
    await pushLine('error', `ls: cannot access '${pathArg || path}': No such file or directory`)
    return
  }

  const entries = listDirectory(path)
  const display = showAll ? entries : entries.filter(name => !name.startsWith('.'))
  if (!display.length) {
    await pushLine('info', '(empty)')
    return
  }

  if (longMode) {
    await pushLine('info', `total ${display.length * 4}`)
    for (const name of display) {
      await pushLine('info', buildLsLongRow(name, path))
    }
    return
  }

  await pushLine('info', display.join('  '))
}

const handleCd = async (target) => {
  if (target === '-') {
    const nextPath = previousCwd.value || '/home/gml'
    previousCwd.value = cwd.value
    cwd.value = nextPath
    await pushLine('info', cwd.value)
    return
  }

  const nextPath = resolvePath(target || '/home/gml')
  if (!isDirectory(nextPath)) {
    await pushLine('error', `cd: ${target}: No such directory`)
    return
  }

  previousCwd.value = cwd.value
  cwd.value = nextPath
}

const handleCat = async (target) => {
  if (!target) {
    await pushLine('error', '用法: cat <file>')
    return
  }

  const path = resolvePath(target)
  const content = fsStore.readFile(path)
  if (!content) {
    await pushLine('error', `cat: ${target}: No such file`)
    return
  }

  for (const line of content.split('\n')) {
    await pushLine('info', line)
  }
}

const handleWhoami = async () => {
  await pushLine('info', 'gml')
}

const handleUname = async (rawTarget) => {
  const args = parseArgs(rawTarget)
  if (!args.length) {
    await pushLine('info', 'Linux')
    return
  }

  if (args.length === 1 && args[0] === '-a') {
    await pushLine('info', 'Linux gml-portal 6.8.0-portal #1 SMP x86_64 GNU/Linux')
    return
  }

  await pushLine('error', 'usage: uname [-a]')
}

const handleDate = async () => {
  await pushLine('info', new Date().toString())
}

const handleUptime = async () => {
  await pushLine('info', 'up 7 days, 03:12, 2 users, load average: 0.08, 0.11, 0.09')
}

const handleIp = async () => {
  await pushLine('info', '1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536')
  await pushLine('info', '    inet 127.0.0.1/8 scope host lo')
  await pushLine('info', '2: eth0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500')
  await pushLine('info', '    inet 192.168.50.23/24 brd 192.168.50.255 scope global eth0')
}

const handleIfconfig = async () => {
  await pushLine('info', 'eth0: flags=4163<UP,BROADCAST,RUNNING,MULTICAST>  mtu 1500')
  await pushLine('info', '        inet 192.168.50.23  netmask 255.255.255.0  broadcast 192.168.50.255')
  await pushLine('info', 'lo: flags=73<UP,LOOPBACK,RUNNING>  mtu 65536')
  await pushLine('info', '        inet 127.0.0.1  netmask 255.0.0.0')
}

const handlePing = async (rawTarget) => {
  const args = parseArgs(rawTarget)
  let host = 'tools.gmlblog.top'
  let count = 3

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]
    if (arg === '-c') {
      const next = Number(args[index + 1])
      if (!Number.isInteger(next) || next < 1 || next > 10) {
        await pushLine('error', 'usage: ping [-c 1-10] <host>')
        return
      }
      count = next
      index += 1
      continue
    }

    if (arg.startsWith('-')) {
      await pushLine('error', 'usage: ping [-c 1-10] <host>')
      return
    }

    host = arg
  }

  const fakeTimes = [22.3, 20.7, 24.9, 21.8, 23.1, 19.9, 25.4, 22.0, 21.2, 24.1]
  await pushLine('info', `PING ${host} (203.0.113.18): 56 data bytes`)
  for (let index = 0; index < count; index += 1) {
    await pushLine('info', `64 bytes from 203.0.113.18: icmp_seq=${index} ttl=53 time=${fakeTimes[index]} ms`)
  }
  await pushLine('info', `--- ${host} ping statistics ---`)
  await pushLine('info', `${count} packets transmitted, ${count} packets received, 0.0% packet loss`)
}

const handleCurl = async (rawTarget) => {
  const args = parseArgs(rawTarget)
  let url = 'https://tools.gmlblog.top/health'
  let headOnly = false

  for (const arg of args) {
    if (arg === '-I' || arg === '--head') {
      headOnly = true
      continue
    }

    if (arg.startsWith('-')) {
      await pushLine('error', 'usage: curl [-I|--head] <url>')
      return
    }

    url = arg
  }

  if (headOnly) {
    await pushLine('info', 'HTTP/2 200')
    await pushLine('info', 'content-type: application/json; charset=utf-8')
    await pushLine('info', 'cache-control: no-store')
    await pushLine('info', 'server: gml-edge')
    await pushLine('info', `x-target-url: ${url}`)
    return
  }

  await pushLine('info', '{')
  await pushLine('info', `  "url": "${url}",`)
  await pushLine('info', '  "status": "online",')
  await pushLine('info', '  "latencyMs": 41,')
  await pushLine('info', `  "checkedAt": "${new Date().toISOString()}"`)
  await pushLine('info', '}')
}

const handlePs = async () => {
  await pushLine('info', 'PID   USER   %CPU  %MEM  COMMAND')
  await pushLine('info', '1024  gml    0.3   1.2   portal-ui')
  await pushLine('info', '1058  gml    0.1   0.8   tools-api')
  await pushLine('info', '1102  gml    0.0   0.4   health-worker')
}

const handleDf = async (rawTarget) => {
  const args = parseArgs(rawTarget)
  if (args.length > 1 || (args.length === 1 && args[0] !== '-h')) {
    await pushLine('error', 'usage: df [-h]')
    return
  }

  const human = args[0] === '-h'
  await pushLine('info', 'Filesystem      Size  Used Avail Use% Mounted on')
  if (human) {
    await pushLine('info', '/dev/sda1       80G   29G   47G  39% /')
    await pushLine('info', 'tmpfs           7.8G   12M  7.8G   1% /run')
    return
  }

  await pushLine('info', '/dev/sda1     83886080 30408704 49283072  39% /')
  await pushLine('info', 'tmpfs          8178892    12288  8166604   1% /run')
}

const handleFree = async (rawTarget) => {
  const args = parseArgs(rawTarget)
  if (args.length > 1 || (args.length === 1 && args[0] !== '-m')) {
    await pushLine('error', 'usage: free [-m]')
    return
  }

  const inMb = args[0] === '-m'
  await pushLine('info', '              total        used        free      shared  buff/cache   available')
  if (inMb) {
    await pushLine('info', 'Mem:          15936        4821        6104         321        5011       10422')
    await pushLine('info', 'Swap:          2048         112        1936')
    return
  }

  await pushLine('info', 'Mem:       16318464     4936704     6242304      328704     5139456    10672128')
  await pushLine('info', 'Swap:       2097152      114688     1982464')
}

const handleHistory = async (rawTarget) => {
  const args = parseArgs(rawTarget)
  if (args.length > 1) {
    await pushLine('error', 'usage: history [N]')
    return
  }

  let limit = null
  if (args.length === 1) {
    const parsed = Number(args[0])
    if (!Number.isInteger(parsed) || parsed < 1) {
      await pushLine('error', 'usage: history [N]')
      return
    }
    limit = parsed
  }

  if (!commandHistory.value.length) {
    await pushLine('info', '(empty)')
    return
  }

  const ordered = [...commandHistory.value].reverse()
  const display = limit == null ? ordered : ordered.slice(-limit)
  display.forEach((item, index) => {
    lines.value.push({ kind: 'info', text: `${String(index + 1).padStart(3, ' ')}  ${item}` })
  })
  await nextTick()
  if (outputRef.value) {
    outputRef.value.scrollTop = outputRef.value.scrollHeight
  }
}

const handleEcho = async (text) => {
  await pushLine('info', text || '')
}

const parseLineRangeArgs = async (rawTarget, commandName) => {
  const args = parseArgs(rawTarget)
  if (!args.length) {
    await pushLine('error', `usage: ${commandName} [-n N] <file>`)
    return null
  }

  let count = 10
  let pathArg = ''

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]
    if (arg === '-n') {
      const next = Number(args[index + 1])
      if (!Number.isInteger(next) || next < 1 || next > 200) {
        await pushLine('error', `usage: ${commandName} [-n N] <file>`)
        return null
      }
      count = next
      index += 1
      continue
    }

    if (arg.startsWith('-')) {
      await pushLine('error', `usage: ${commandName} [-n N] <file>`)
      return null
    }

    pathArg = arg
  }

  if (!pathArg) {
    await pushLine('error', `usage: ${commandName} [-n N] <file>`)
    return null
  }

  const path = resolvePath(pathArg)
  const content = fsStore.readFile(path)
  if (content == null) {
    await pushLine('error', `${commandName}: ${pathArg}: No such file`)
    return null
  }

  return { count, content }
}

const handleHead = async (rawTarget) => {
  const parsed = await parseLineRangeArgs(rawTarget, 'head')
  if (!parsed) return

  const linesToShow = parsed.content.split('\n').slice(0, parsed.count)
  for (const line of linesToShow) {
    await pushLine('info', line)
  }
}

const handleTail = async (rawTarget) => {
  const parsed = await parseLineRangeArgs(rawTarget, 'tail')
  if (!parsed) return

  const rows = parsed.content.split('\n')
  const linesToShow = rows.slice(Math.max(rows.length - parsed.count, 0))
  for (const line of linesToShow) {
    await pushLine('info', line)
  }
}

const handleGrep = async (rawTarget) => {
  const args = parseArgs(rawTarget)
  if (args.length < 2) {
    await pushLine('error', 'usage: grep <pattern> <file>')
    return
  }

  const pattern = args[0]
  const fileArg = args[1]
  const path = resolvePath(fileArg)
  const content = fsStore.readFile(path)
  if (content == null) {
    await pushLine('error', `grep: ${fileArg}: No such file`)
    return
  }

  const rows = content.split('\n')
  const matches = rows
    .map((line, index) => ({ line, number: index + 1 }))
    .filter(item => item.line.includes(pattern))

  if (!matches.length) {
    await pushLine('info', '(no matches)')
    return
  }

  matches.forEach((item) => {
    lines.value.push({ kind: 'info', text: `${item.number}:${item.line}` })
  })
  await nextTick()
  if (outputRef.value) {
    outputRef.value.scrollTop = outputRef.value.scrollHeight
  }
}

const handleWc = async (rawTarget) => {
  const args = parseArgs(rawTarget)
  if (args.length !== 2 || args[0] !== '-l') {
    await pushLine('error', 'usage: wc -l <file>')
    return
  }

  const fileArg = args[1]
  const path = resolvePath(fileArg)
  const content = fsStore.readFile(path)
  if (content == null) {
    await pushLine('error', `wc: ${fileArg}: No such file`)
    return
  }

  const lineCount = content === '' ? 0 : content.split('\n').length
  await pushLine('info', `${String(lineCount).padStart(7, ' ')} ${fileArg}`)
}

const handleMkdir = async (rawTarget) => {
  const args = parseArgs(rawTarget)
  if (!args.length || args.length > 2) {
    await pushLine('error', 'usage: mkdir [-p] <dir>')
    return
  }

  const recursive = args[0] === '-p'
  const dirArg = recursive ? args[1] : args[0]
  if (!dirArg) {
    await pushLine('error', 'usage: mkdir [-p] <dir>')
    return
  }

  const targetPath = resolvePath(dirArg)
  if (targetPath === '/') {
    await pushLine('error', 'mkdir: cannot create directory "/": File exists')
    return
  }

  if (fileExists(targetPath)) {
    await pushLine('error', `mkdir: cannot create directory '${dirArg}': Not a directory`)
    return
  }

  if (isDirectory(targetPath)) {
    if (!recursive) {
      await pushLine('error', `mkdir: cannot create directory '${dirArg}': File exists`)
    }
    return
  }

  const parts = targetPath.split('/').filter(Boolean)
  let current = ''
  for (let index = 0; index < parts.length; index += 1) {
    current += `/${parts[index]}`
    if (isDirectory(current)) continue

    const parent = getParentPath(current)
    if (!isDirectory(parent)) {
      await pushLine('error', `mkdir: cannot create directory '${dirArg}': No such file or directory`)
      return
    }

    if (!recursive && index !== parts.length - 1) {
      await pushLine('error', `mkdir: cannot create directory '${dirArg}': No such file or directory`)
      return
    }

    fsStore.createDirectory(current)
  }
}

const handleTouch = async (rawTarget) => {
  const args = parseArgs(rawTarget)
  if (args.length !== 1) {
    await pushLine('error', 'usage: touch <file>')
    return
  }

  const fileArg = args[0]
  const targetPath = resolvePath(fileArg)
  if (isDirectory(targetPath)) {
    await pushLine('error', `touch: ${fileArg}: Is a directory`)
    return
  }

  const parent = getParentPath(targetPath)
  if (!isDirectory(parent)) {
    await pushLine('error', `touch: cannot touch '${fileArg}': No such file or directory`)
    return
  }

  if (!fileExists(targetPath)) {
    fsStore.writeFile(targetPath, '')
  }
}

const handleRm = async (rawTarget) => {
  const args = parseArgs(rawTarget)
  if (!args.length) {
    await pushLine('error', 'usage: rm [-r] [-f] <path>')
    return
  }

  const flags = new Set()
  let pathArg = ''

  for (const arg of args) {
    if (arg.startsWith('-') && !pathArg) {
      for (const flag of arg.slice(1)) {
        if (flag !== 'r' && flag !== 'f') {
          await pushLine('error', 'usage: rm [-r] [-f] <path>')
          return
        }
        flags.add(flag)
      }
      continue
    }

    if (pathArg) {
      await pushLine('error', 'usage: rm [-r] [-f] <path>')
      return
    }
    pathArg = arg
  }

  if (!pathArg) {
    await pushLine('error', 'usage: rm [-r] [-f] <path>')
    return
  }

  const recursive = flags.has('r')
  const force = flags.has('f')
  const targetPath = resolvePath(pathArg)

  if (targetPath === '/') {
    if (recursive && force) {
      await pushLine('error', 'rm: it is dangerous to operate recursively on /')
      await pushLine('info', 'safe-mode: root filesystem is immutable in simulation')
      if (store.settings.terminalEasterEggsEnabled) {
        await pushLine('success', 'Easter egg unlocked: [KERNEL] nice try, operator : )')
        if (dangerRmStreak.value >= 3) {
          await triggerPanicMode()
        }
      }
      return
    }
    await pushLine('error', "rm: cannot remove '/': Device or resource busy")
    return
  }

  if (fileExists(targetPath)) {
    fsStore.deleteFile(targetPath)
    return
  }

  if (isDirectory(targetPath)) {
    if (!recursive) {
      await pushLine('error', `rm: cannot remove '${pathArg}': Is a directory`)
      return
    }

    removeDirectoryTree(targetPath)
    removeEntryFromDirectory(getParentPath(targetPath), getBaseName(targetPath))
    return
  }

  if (!force) {
    await pushLine('error', `rm: cannot remove '${pathArg}': No such file or directory`)
  }
}

const executeCommand = async (rawInput) => {
  const trimmed = rawInput.trim()
  if (!trimmed) return

  await pushLine('command', trimmed)

  const [cmd, ...args] = trimmed.split(/\s+/)
  const inputCommand = cmd.toLowerCase()
  const commandName = commandAliases[inputCommand] || inputCommand
  const rawTarget = args.join(' ')
  const target = rawTarget.toLowerCase()

  const dangerousRootRm = commandName === 'rm' && isRootDangerousRmAttempt(rawTarget)
  if (dangerousRootRm) {
    dangerRmStreak.value += 1
  } else {
    dangerRmStreak.value = 0
  }

  if (commandName === 'help') {
    await handleHelp()
    return
  }

  if (commandName === 'open') {
    await handleOpen(target)
    return
  }

  if (commandName === 'status') {
    await handleStatus(target)
    return
  }

  if (commandName === 'theme') {
    await handleTheme(target)
    return
  }

  if (commandName === 'pwd') {
    await handlePwd()
    return
  }

  if (commandName === 'ls') {
    await handleLs(rawTarget)
    return
  }

  if (commandName === 'cd') {
    await handleCd(target)
    return
  }

  if (commandName === 'cat') {
    await handleCat(target)
    return
  }

  if (commandName === 'whoami') {
    await handleWhoami()
    return
  }

  if (commandName === 'uname') {
    await handleUname(rawTarget)
    return
  }

  if (commandName === 'date') {
    await handleDate()
    return
  }

  if (commandName === 'uptime') {
    await handleUptime()
    return
  }

  if (commandName === 'ip') {
    if (target && target !== 'a' && target !== 'addr' && target !== 'address') {
      await pushLine('error', '用法: ip [a|addr]')
      return
    }
    await handleIp()
    return
  }

  if (commandName === 'ifconfig') {
    await handleIfconfig()
    return
  }

  if (commandName === 'ping') {
    await handlePing(rawTarget)
    return
  }

  if (commandName === 'curl') {
    await handleCurl(rawTarget || target)
    return
  }

  if (commandName === 'ps') {
    await handlePs()
    return
  }

  if (commandName === 'df') {
    await handleDf(rawTarget)
    return
  }

  if (commandName === 'free') {
    await handleFree(rawTarget)
    return
  }

  if (commandName === 'history') {
    await handleHistory(rawTarget)
    return
  }

  if (commandName === 'echo') {
    await handleEcho(rawTarget)
    return
  }

  if (commandName === 'head') {
    await handleHead(rawTarget)
    return
  }

  if (commandName === 'tail') {
    await handleTail(rawTarget)
    return
  }

  if (commandName === 'grep') {
    await handleGrep(rawTarget)
    return
  }

  if (commandName === 'wc') {
    await handleWc(rawTarget)
    return
  }

  if (commandName === 'mkdir') {
    await handleMkdir(rawTarget)
    return
  }

  if (commandName === 'touch') {
    await handleTouch(rawTarget)
    return
  }

  if (commandName === 'rm') {
    await handleRm(rawTarget)
    return
  }

  if (commandName === 'sudo') {
    await handleSudo(rawTarget)
    return
  }

  if (commandName === 'exit') {
    await handleExit()
    return
  }

  if (commandName === 'clear') {
    lines.value = []
    return
  }

  await pushLine('error', `bash: ${inputCommand}: command not found`)
}

const handleSubmit = async () => {
  const input = command.value
  if (!input.trim()) return

  commandHistory.value = [input, ...commandHistory.value.filter(item => item !== input)].slice(0, store.settings.terminalHistoryLimit || 30)
  historyCursor.value = -1
  command.value = ''

  await executeCommand(input)
}

const historyUp = () => {
  if (!commandHistory.value.length) return
  const next = Math.min(historyCursor.value + 1, commandHistory.value.length - 1)
  historyCursor.value = next
  command.value = commandHistory.value[next]
}

const historyDown = () => {
  if (!commandHistory.value.length) return
  const next = historyCursor.value - 1
  if (next < 0) {
    historyCursor.value = -1
    command.value = ''
    return
  }

  historyCursor.value = next
  command.value = commandHistory.value[next]
}

onMounted(() => {
  focusInput()
})

onUnmounted(() => {
  if (panicTimer) {
    clearTimeout(panicTimer)
    panicTimer = null
  }
})
</script>

<style scoped>
.terminal-root {
  width: 100%;
  height: 100%;
  display: grid;
  grid-template-rows: 1fr auto;
  padding: 14px;
  font-family: 'JetBrains Mono', 'SF Mono', Menlo, Consolas, monospace;
  font-size: 13px;
}

.font-small {
  font-size: 12px;
}

.font-medium {
  font-size: 13px;
}

.font-large {
  font-size: 15px;
}

.terminal-output {
  overflow: auto;
  padding-bottom: 8px;
}

.terminal-line {
  line-height: 1.6;
  word-break: break-word;
}

.terminal-input-row {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 10px;
  align-items: center;
}

.terminal-prefix {
  color: rgb(34 197 94);
  user-select: none;
}

.terminal-input {
  border: 0;
  outline: none;
  background: transparent;
  color: inherit;
  font: inherit;
}

.line-command {
  color: rgb(209 250 229);
}

.line-info {
  color: rgb(125 211 252);
}

.line-success {
  color: rgb(74 222 128);
}

.line-error {
  color: rgb(251 113 133);
}

.line-status-online {
  color: rgb(74 222 128);
}

.line-status-offline {
  color: rgb(251 113 133);
}

.line-status-local {
  color: rgb(148 163 184);
}

.line-panic {
  color: rgb(252 165 165);
  text-shadow: 0 0 10px rgba(248, 113, 113, 0.5);
}

.mode-panic {
  animation: panic-flicker 180ms steps(2) infinite;
}

.mode-panic .terminal-prefix {
  color: rgb(248 113 113);
}

.mode-panic .terminal-output {
  box-shadow: inset 0 0 0 1px rgba(248, 113, 113, 0.35);
}

@keyframes panic-flicker {
  0%,
  100% {
    filter: saturate(1) contrast(1);
  }
  50% {
    filter: saturate(1.2) contrast(1.08);
  }
}

.theme-cyber {
  background: linear-gradient(180deg, rgba(2, 6, 23, 0.95) 0%, rgba(3, 13, 31, 0.95) 100%);
  color: rgb(186 230 253);
  border-top: 1px solid rgba(56, 189, 248, 0.2);
}

.theme-clean {
  background: linear-gradient(180deg, rgba(15, 23, 42, 0.9) 0%, rgba(30, 41, 59, 0.92) 100%);
  color: rgb(226 232 240);
  border-top: 1px solid rgba(148, 163, 184, 0.24);
}
</style>
