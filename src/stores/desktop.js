import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useDesktopStore = defineStore('desktop', () => {
  const PINNED_APPS_STORAGE_KEY = 'desktop.pinnedApps'
  const RECENT_APPS_STORAGE_KEY = 'desktop.recentApps'
  const SETTINGS_STORAGE_KEY = 'desktop.settings'
  const TRASHED_APPS_STORAGE_KEY = 'desktop.trashedApps'
  const REMOVED_APPS_STORAGE_KEY = 'desktop.removedApps'
  const APP_ORDER_STORAGE_KEY = 'desktop.appOrder'

  // 应用配置
  const apps = ref([
    {
      id: 'tools',
      name: 'Tools',
      icon: '🛠️',
      color: '#FF9500',
      url: 'https://tools.gmlblog.top',
      domain: 'tools.gmlblog.top',
      status: 'online',
      updatedAt: '2026-02-10',
      description: 'Vue 3 + TS + Django DRF 工具集',
    },
    {
      id: 'wiki',
      name: '知识库',
      icon: '📚',
      color: '#007AFF',
      url: 'https://wiki.gmlblog.top',
      domain: 'wiki.gmlblog.top',
      status: 'online',
      updatedAt: '2026-02-09',
      description: 'Vue 3 + Django + PostgreSQL 知识库',
    },
    {
      id: 'vault',
      name: '密码箱',
      icon: '🔐',
      color: '#34C759',
      url: 'https://vault.gmlblog.top',
      domain: 'vault.gmlblog.top',
      status: 'online',
      updatedAt: '2026-02-08',
      description: 'FastAPI + PostgreSQL + Redis 密码管理',
    },
    {
      id: 'blog',
      name: '博客',
      icon: '📝',
      color: '#AF52DE',
      url: 'https://blog.gmlblog.top',
      domain: 'blog.gmlblog.top',
      status: 'offline',
      updatedAt: '2026-02-11',
      description: 'Vue 3 + FastAPI + PostgreSQL AI 博客',
    },
    {
      id: 'github',
      name: 'GitHub',
      icon: '🐙',
      color: '#24292f',
      url: 'https://github.com/kaliluying',
      domain: 'github.com',
      status: 'online',
      updatedAt: '2026-02-11',
      description: '代码仓库主页',
    },
    {
      id: 'bilibili',
      name: '哔哩哔哩',
      icon: '📺',
      color: '#00A1D6',
      url: 'https://space.bilibili.com/671157361',
      domain: 'space.bilibili.com',
      status: 'online',
      updatedAt: '2026-02-11',
      description: 'B站空间主页',
    },
    {
      id: 'terminal',
      name: '终端',
      icon: '>_',
      color: '#000000',
      url: null,
      domain: 'terminal.local',
      status: 'local',
      updatedAt: '2026-02-10',
      description: '命令行终端',
    },
    {
      id: 'settings',
      name: '设置',
      icon: '⚙️',
      color: '#8E8E93',
      url: null,
      domain: 'settings.local',
      status: 'local',
      updatedAt: '2026-02-11',
      description: '系统设置',
    },
    {
      id: 'profile',
      name: '关于我',
      icon: '👤',
      color: '#5AC8FA',
      url: null,
      domain: 'profile.local',
      status: 'local',
      updatedAt: '2026-02-14',
      description: '开发者：GML｜专注 AI 全栈产品与效率工具落地',
      detailTitle: '个人简介',
      details: [
        '独立开发者，持续交付 Vue + Python 技术栈的线上产品。',
        '近期项目覆盖工具集、知识库、密码管理与 AI 博客四条产品线。',
        '偏好把复杂流程拆成可复用、可维护、可持续迭代的工程模块。',
      ],
      quickFacts: [
        { label: '方向', value: 'AI 全栈 / 工具产品' },
        { label: '地点', value: '中国 · 远程协作' },
        { label: '主力后端', value: 'FastAPI / Django REST Framework' },
        { label: '状态', value: '可接合作 / 技术交流' },
      ],
      actions: [
        { id: 'profile-blog', label: '打开博客', type: 'link', value: 'https://blog.gmlblog.top' },
        { id: 'profile-github', label: '打开 GitHub', type: 'link', value: 'https://github.com/kaliluying' },
      ],
    },
    {
      id: 'contact',
      name: '联系方式',
      icon: '📮',
      color: '#FF2D55',
      url: null,
      domain: 'contact.local',
      status: 'local',
      updatedAt: '2026-02-14',
      description: '邮箱：kaliluying@gmail.com｜GitHub：github.com/kaliluying',
      detailTitle: '联系渠道',
      details: [
        '欢迎合作邀约、技术交流与问题反馈。',
        '优先邮件联系，通常会在 24 小时内回复。',
      ],
      quickFacts: [
        { label: '邮箱', value: 'kaliluying@gmail.com' },
        { label: 'GitHub', value: 'github.com/kaliluying' },
        { label: 'Bilibili', value: 'space.bilibili.com/671157361' },
        { label: '沟通偏好', value: '邮件 > GitHub Issue / 私信' },
      ],
      actions: [
        { id: 'contact-email-copy', label: '复制邮箱', type: 'copy', value: 'kaliluying@gmail.com' },
        { id: 'contact-email-open', label: '写邮件', type: 'link', value: 'mailto:kaliluying@gmail.com' },
        { id: 'contact-github-copy', label: '复制 GitHub', type: 'copy', value: 'https://github.com/kaliluying' },
        { id: 'contact-github-open', label: '打开 GitHub', type: 'link', value: 'https://github.com/kaliluying' },
        { id: 'contact-bilibili-open', label: '打开 Bilibili', type: 'link', value: 'https://space.bilibili.com/671157361' },
      ],
    },
    {
      id: 'stack',
      name: '技术栈',
      icon: '🧩',
      color: '#30D158',
      url: null,
      domain: 'stack.local',
      status: 'local',
      updatedAt: '2026-02-14',
      description: 'Vue 3 + TypeScript / FastAPI / Django / PostgreSQL / Redis',
      detailTitle: '技术与项目证据',
      details: [
        '核心交付栈：Vue 3 + TypeScript + Vite，后端以 FastAPI 与 Django 双栈并行。',
        '数据层以 PostgreSQL 为主，按场景使用 Redis 会话与异步访问能力。',
        '在多项目中持续实践 Pinia、Vue Router、DRF、SQLAlchemy、Alembic 与 Pytest。',
      ],
      quickFacts: [
        { label: '前端', value: 'Vue 3 / TypeScript / Vite / Pinia / Vue Router' },
        { label: '后端', value: 'FastAPI / Django 5.2 / DRF / SQLAlchemy 2.0' },
        { label: '数据与安全', value: 'PostgreSQL / Redis / asyncpg / cryptography' },
        { label: '质量保障', value: 'Vitest / Pytest / Alembic / Docker Compose' },
      ],
      evidence: [
        { id: 'ev-tools', name: 'MyTools / Tools', meta: 'Vue 3 + TS + Django DRF + Naive UI + FFmpeg', url: 'https://github.com/kaliluying/MyTools' },
        { id: 'ev-wiki', name: 'knowledge-ai / 知识库', meta: 'Vue 3 + Django 5.2 + PostgreSQL 17 + TipTap + D3.js', url: 'https://github.com/kaliluying/knowledge-ai' },
        { id: 'ev-vault', name: 'vault / 密码箱', meta: 'FastAPI + PostgreSQL + Redis + Jinja2 + cryptography', url: 'https://github.com/kaliluying/vault' },
        { id: 'ev-blog', name: 'blog-ai / 博客', meta: 'Vue 3 + FastAPI + SQLAlchemy 2.0 + Alembic + Pytest', url: 'https://github.com/kaliluying/blog-ai' },
      ],
      actions: [
        { id: 'stack-tools', label: '打开 Tools', type: 'link', value: 'https://tools.gmlblog.top' },
        { id: 'stack-wiki', label: '打开知识库', type: 'link', value: 'https://wiki.gmlblog.top' },
        { id: 'stack-vault', label: '打开密码箱', type: 'link', value: 'https://vault.gmlblog.top' },
        { id: 'stack-blog', label: '打开博客', type: 'link', value: 'https://blog.gmlblog.top' },
        { id: 'stack-github', label: '查看 GitHub', type: 'link', value: 'https://github.com/kaliluying' },
      ],
    },
  ])

  // 窗口状态
  const windows = ref([])
  const activeWindowId = ref(null)
  const maxZIndex = ref(100)
  const pinnedAppIds = ref([])
  const recentAppIds = ref([])
  const trashedAppIds = ref([])
  const removedAppIds = ref([])
  const isMonitoringStatus = ref(false)
  const lastStatusCheckAt = ref(null)

  let statusMonitorTimer = null

  // 桌面设置
  const settings = ref({
    wallpaper: 'deep-net',
    wallpaperColor: '#1a1a2e',
    showDock: true,
    dockPosition: 'bottom',
    iconSize: 'medium',
    motionLevel: 'medium',
    codeRainEnabled: true,
    dockAnimationLevel: 'medium',
    terminalFontSize: 'medium',
    terminalHistoryLimit: 100,
    terminalEasterEggsEnabled: true,
    autoStartMonitoring: true,
    statusMonitorIntervalMs: 45000,
  })

  // 计算属性
  const openWindows = computed(() => windows.value.filter(w => !w.minimized))
  const minimizedWindows = computed(() => windows.value.filter(w => w.minimized))
  const serviceSummary = computed(() => {
    const remoteApps = apps.value.filter(app => app.url)
    const online = remoteApps.filter(app => app.status === 'online').length
    const offline = remoteApps.filter(app => app.status === 'offline').length
    const local = apps.value.filter(app => app.status === 'local').length

    return {
      online,
      offline,
      local,
      total: remoteApps.length,
    }
  })

  const pinnedApps = computed(() => {
    const appMap = new Map(apps.value.map(app => [app.id, app]))
    return pinnedAppIds.value
      .map(id => appMap.get(id))
      .filter(Boolean)
      .filter(app => !trashedAppIds.value.includes(app.id) && !removedAppIds.value.includes(app.id))
  })

  const recentApps = computed(() => {
    const appMap = new Map(apps.value.map(app => [app.id, app]))
    return recentAppIds.value
      .map(id => appMap.get(id))
      .filter(Boolean)
      .filter(app => !trashedAppIds.value.includes(app.id) && !removedAppIds.value.includes(app.id))
  })

  const desktopApps = computed(() => {
    return apps.value.filter(app => !trashedAppIds.value.includes(app.id) && !removedAppIds.value.includes(app.id))
  })

  const trashedApps = computed(() => {
    return apps.value.filter(app => trashedAppIds.value.includes(app.id))
  })

  const trashCount = computed(() => trashedAppIds.value.length)

  const readStorageList = (key) => {
    if (typeof window === 'undefined') return []

    try {
      const raw = window.localStorage.getItem(key)
      if (!raw) return []
      const parsed = JSON.parse(raw)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }

  const writeStorageList = (key, value) => {
    if (typeof window === 'undefined') return

    try {
      window.localStorage.setItem(key, JSON.stringify(value))
    } catch {
    }
  }

  const loadPortalState = () => {
    const validAppIds = new Set(apps.value.map(app => app.id))

    pinnedAppIds.value = readStorageList(PINNED_APPS_STORAGE_KEY)
      .filter(id => validAppIds.has(id))
      .slice(0, 8)

    recentAppIds.value = readStorageList(RECENT_APPS_STORAGE_KEY)
      .filter(id => validAppIds.has(id))
      .slice(0, 8)

    trashedAppIds.value = readStorageList(TRASHED_APPS_STORAGE_KEY)
      .filter(id => validAppIds.has(id))

    removedAppIds.value = readStorageList(REMOVED_APPS_STORAGE_KEY)
      .filter(id => validAppIds.has(id))

    loadAppOrder()
    loadSettings()
  }

  const loadAppOrder = () => {
    const validAppIds = new Set(apps.value.map(app => app.id))
    const orderedIds = readStorageList(APP_ORDER_STORAGE_KEY)
      .filter(id => validAppIds.has(id))

    if (!orderedIds.length) return

    const orderMap = new Map(orderedIds.map((id, index) => [id, index]))
    apps.value = [...apps.value].sort((a, b) => {
      const aIndex = orderMap.has(a.id) ? orderMap.get(a.id) : Number.MAX_SAFE_INTEGER
      const bIndex = orderMap.has(b.id) ? orderMap.get(b.id) : Number.MAX_SAFE_INTEGER
      return aIndex - bIndex
    })
  }

  const saveAppOrder = () => {
    writeStorageList(APP_ORDER_STORAGE_KEY, apps.value.map(app => app.id))
  }

  const saveTrashState = () => {
    writeStorageList(TRASHED_APPS_STORAGE_KEY, trashedAppIds.value)
    writeStorageList(REMOVED_APPS_STORAGE_KEY, removedAppIds.value)
  }

  const loadSettings = () => {
    if (typeof window === 'undefined') return

    const defaults = {
      wallpaper: 'deep-net',
      wallpaperColor: '#1a1a2e',
      showDock: true,
      dockPosition: 'bottom',
      iconSize: 'medium',
      motionLevel: 'medium',
      codeRainEnabled: true,
      dockAnimationLevel: 'medium',
      terminalFontSize: 'medium',
      terminalHistoryLimit: 100,
      terminalEasterEggsEnabled: true,
      autoStartMonitoring: true,
      statusMonitorIntervalMs: 45000,
    }

    const validIconSizes = new Set(['small', 'medium', 'large'])
    const validDockPositions = new Set(['bottom'])
    const validMotionLevels = new Set(['low', 'medium', 'high'])
    const validDockAnimationLevels = new Set(['low', 'medium', 'high'])
    const validTerminalFontSizes = new Set(['small', 'medium', 'large'])
    const validHistoryLimits = new Set([30, 100, 300])
    const validMonitorIntervals = new Set([15000, 30000, 45000, 60000])

    try {
      const raw = window.localStorage.getItem(SETTINGS_STORAGE_KEY)
      if (!raw) {
        settings.value = defaults
        return
      }

      const parsed = JSON.parse(raw)
      if (!parsed || typeof parsed !== 'object') {
        settings.value = defaults
        return
      }

      settings.value = {
        wallpaper: typeof parsed.wallpaper === 'string' ? parsed.wallpaper : defaults.wallpaper,
        wallpaperColor: typeof parsed.wallpaperColor === 'string' ? parsed.wallpaperColor : defaults.wallpaperColor,
        showDock: typeof parsed.showDock === 'boolean' ? parsed.showDock : defaults.showDock,
        dockPosition: validDockPositions.has(parsed.dockPosition) ? parsed.dockPosition : defaults.dockPosition,
        iconSize: validIconSizes.has(parsed.iconSize) ? parsed.iconSize : defaults.iconSize,
        motionLevel: validMotionLevels.has(parsed.motionLevel) ? parsed.motionLevel : defaults.motionLevel,
        codeRainEnabled: typeof parsed.codeRainEnabled === 'boolean' ? parsed.codeRainEnabled : defaults.codeRainEnabled,
        dockAnimationLevel: validDockAnimationLevels.has(parsed.dockAnimationLevel) ? parsed.dockAnimationLevel : defaults.dockAnimationLevel,
        terminalFontSize: validTerminalFontSizes.has(parsed.terminalFontSize) ? parsed.terminalFontSize : defaults.terminalFontSize,
        terminalHistoryLimit: validHistoryLimits.has(parsed.terminalHistoryLimit) ? parsed.terminalHistoryLimit : defaults.terminalHistoryLimit,
        terminalEasterEggsEnabled: typeof parsed.terminalEasterEggsEnabled === 'boolean' ? parsed.terminalEasterEggsEnabled : defaults.terminalEasterEggsEnabled,
        autoStartMonitoring: typeof parsed.autoStartMonitoring === 'boolean' ? parsed.autoStartMonitoring : defaults.autoStartMonitoring,
        statusMonitorIntervalMs: validMonitorIntervals.has(parsed.statusMonitorIntervalMs) ? parsed.statusMonitorIntervalMs : defaults.statusMonitorIntervalMs,
      }
    } catch {
      settings.value = defaults
    }
  }

  const saveSettings = () => {
    if (typeof window === 'undefined') return

    try {
      window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings.value))
    } catch {
    }
  }

  const togglePinnedApp = (appId) => {
    const exists = pinnedAppIds.value.includes(appId)
    if (exists) {
      pinnedAppIds.value = pinnedAppIds.value.filter(id => id !== appId)
    } else {
      pinnedAppIds.value = [appId, ...pinnedAppIds.value].slice(0, 8)
    }

    writeStorageList(PINNED_APPS_STORAGE_KEY, pinnedAppIds.value)
  }

  const recordAppLaunch = (appId) => {
    recentAppIds.value = [appId, ...recentAppIds.value.filter(id => id !== appId)].slice(0, 8)
    writeStorageList(RECENT_APPS_STORAGE_KEY, recentAppIds.value)
  }

  const sanitizeAppFromQuickLists = (appId) => {
    pinnedAppIds.value = pinnedAppIds.value.filter(id => id !== appId)
    recentAppIds.value = recentAppIds.value.filter(id => id !== appId)
    writeStorageList(PINNED_APPS_STORAGE_KEY, pinnedAppIds.value)
    writeStorageList(RECENT_APPS_STORAGE_KEY, recentAppIds.value)
  }

  const closeWindowsByAppId = (appId) => {
    const closingIds = windows.value.filter(w => w.appId === appId).map(w => w.id)
    if (!closingIds.length) return
    windows.value = windows.value.filter(w => w.appId !== appId)

    if (activeWindowId.value && closingIds.includes(activeWindowId.value)) {
      const remaining = windows.value.filter(w => !w.minimized)
      activeWindowId.value = remaining.length > 0 ? remaining[remaining.length - 1].id : null
      if (remaining.length > 0) remaining[remaining.length - 1].focused = true
    }
  }

  const canTrashApp = (appId) => appId !== 'terminal' && appId !== 'settings'

  const moveAppToTrash = (appId) => {
    const app = apps.value.find(item => item.id === appId)
    if (!app) return
    if (!canTrashApp(appId)) return
    if (trashedAppIds.value.includes(appId)) return
    if (removedAppIds.value.includes(appId)) return

    trashedAppIds.value = [appId, ...trashedAppIds.value.filter(id => id !== appId)]
    sanitizeAppFromQuickLists(appId)
    closeWindowsByAppId(appId)
    saveTrashState()
  }

  const restoreAppFromTrash = (appId) => {
    if (!trashedAppIds.value.includes(appId)) return
    trashedAppIds.value = trashedAppIds.value.filter(id => id !== appId)
    saveTrashState()
  }

  const deleteFromTrash = (appId) => {
    if (!trashedAppIds.value.includes(appId)) return
    trashedAppIds.value = trashedAppIds.value.filter(id => id !== appId)
    removedAppIds.value = [appId, ...removedAppIds.value.filter(id => id !== appId)]
    sanitizeAppFromQuickLists(appId)
    closeWindowsByAppId(appId)
    saveTrashState()
  }

  const emptyTrash = () => {
    if (!trashedAppIds.value.length) return
    const toDelete = [...trashedAppIds.value]
    trashedAppIds.value = []
    removedAppIds.value = [...new Set([...toDelete, ...removedAppIds.value])]
    toDelete.forEach((appId) => {
      sanitizeAppFromQuickLists(appId)
      closeWindowsByAppId(appId)
    })
    saveTrashState()
  }

  const openTrashWindow = () => {
    const existingWindow = windows.value.find(w => w.appId === 'trash' && !w.minimized)
    if (existingWindow) {
      bringToFront(existingWindow.id)
      return
    }

    const frame = buildWindowFrame('trash', windows.value.length, { width: 820, height: 560 })
    const newWindow = {
      id: `window-${Date.now()}`,
      appId: 'trash',
      title: '废纸篓',
      icon: '🗑️',
      url: null,
      x: frame.x,
      y: frame.y,
      width: frame.width,
      height: frame.height,
      zIndex: ++maxZIndex.value,
      minimized: false,
      maximized: false,
      focused: true,
    }

    windows.value.forEach(w => {
      w.focused = false
    })
    windows.value.push(newWindow)
    activeWindowId.value = newWindow.id
  }

  const probeUrl = async (url, timeoutMs = 6000) => {
    if (typeof window === 'undefined') return false

    const controller = new AbortController()
    const timeout = window.setTimeout(() => controller.abort(), timeoutMs)

    try {
      await fetch(url, {
        method: 'GET',
        mode: 'no-cors',
        cache: 'no-store',
        signal: controller.signal,
      })
      return true
    } catch {
      return false
    } finally {
      window.clearTimeout(timeout)
    }
  }

  const checkServiceStatuses = async () => {
    if (typeof window === 'undefined') return
    if (isMonitoringStatus.value) return

    isMonitoringStatus.value = true
    const checks = apps.value.map(async (app) => {
      if (!app.url) return
      if (app.id === 'terminal' || app.id === 'settings') {
        app.status = 'local'
        return
      }

      const reachable = await probeUrl(app.url)
      app.status = reachable ? 'online' : 'offline'
      app.updatedAt = new Date().toISOString().slice(0, 10)
    })

    await Promise.all(checks)
    lastStatusCheckAt.value = Date.now()
    isMonitoringStatus.value = false
  }

  const startStatusMonitoring = (intervalMs = 45000) => {
    if (typeof window === 'undefined') return
    if (statusMonitorTimer) return

    checkServiceStatuses()
    statusMonitorTimer = window.setInterval(checkServiceStatuses, intervalMs)
  }

  const stopStatusMonitoring = () => {
    if (typeof window === 'undefined') return
    if (!statusMonitorTimer) return
    window.clearInterval(statusMonitorTimer)
    statusMonitorTimer = null
  }

  // 方法
  const isCompactMobileViewport = () => {
    if (typeof window === 'undefined') return false
    return window.innerWidth < 768
  }

  const getCenteredWindowFrame = ({ width, height }) => {
    if (typeof window === 'undefined') return null

    const horizontalPadding = 20
    const topOffset = 56
    const bottomOffset = settings.value.showDock ? 96 : 20
    const availableWidth = Math.max(320, window.innerWidth - horizontalPadding * 2)
    const availableHeight = Math.max(320, window.innerHeight - topOffset - bottomOffset)
    const safeWidth = Math.min(width, availableWidth)
    const safeHeight = Math.min(height, availableHeight)
    const centeredX = Math.round((window.innerWidth - safeWidth) / 2)
    const centeredY = Math.round((window.innerHeight - safeHeight) / 2)
    const maxX = window.innerWidth - safeWidth - horizontalPadding
    const maxY = window.innerHeight - safeHeight - bottomOffset

    return {
      x: Math.max(horizontalPadding, Math.min(centeredX, maxX)),
      y: Math.max(topOffset, Math.min(centeredY, maxY)),
      width: safeWidth,
      height: safeHeight,
    }
  }

  const buildWindowFrame = (appId, index, size = { width: 900, height: 600 }) => {
    const mobileApps = ['terminal', 'settings', 'profile', 'contact', 'stack']
    if (typeof window !== 'undefined' && isCompactMobileViewport() && mobileApps.includes(appId)) {
      const horizontalPadding = 8
      const topOffset = 48
      const bottomOffset = 88
      const availableWidth = Math.max(240, window.innerWidth - horizontalPadding * 2)
      const availableHeight = Math.max(260, window.innerHeight - topOffset - bottomOffset)

      return {
        x: horizontalPadding,
        y: topOffset,
        width: availableWidth,
        height: availableHeight,
      }
    }

    const centeredFrame = getCenteredWindowFrame(size)
    if (centeredFrame) return centeredFrame

    return {
      x: 100 + (index * 30),
      y: 100 + (index * 30),
      width: size.width,
      height: size.height,
    }
  }

  const openWindow = (appId) => {
    const app = apps.value.find(a => a.id === appId)
    if (!app) return
    if (trashedAppIds.value.includes(appId) || removedAppIds.value.includes(appId)) return

    const shouldNavigate = app.url && app.id !== 'terminal' && app.id !== 'settings'
    if (shouldNavigate) {
      if (typeof window !== 'undefined') {
        window.open(app.url, '_blank', 'noopener,noreferrer')
      }
      recordAppLaunch(appId)
      return
    }

    const existingWindow = windows.value.find(w => w.appId === appId && !w.minimized)
    if (existingWindow) {
      bringToFront(existingWindow.id)
      recordAppLaunch(appId)
      return
    }

    const frame = buildWindowFrame(appId, windows.value.length)
    const newWindow = {
      id: `window-${Date.now()}`,
      appId: app.id,
      title: app.name,
      icon: app.icon,
      description: app.description,
      detailTitle: app.detailTitle,
      details: app.details,
      quickFacts: app.quickFacts,
      evidence: app.evidence,
      actions: app.actions,
      url: app.url,
      x: frame.x,
      y: frame.y,
      width: frame.width,
      height: frame.height,
      zIndex: ++maxZIndex.value,
      minimized: false,
      maximized: false,
      focused: true,
    }

    windows.value.forEach(w => w.focused = false)
    windows.value.push(newWindow)
    activeWindowId.value = newWindow.id
    recordAppLaunch(appId)
  }

  const closeWindow = (windowId) => {
    const index = windows.value.findIndex(w => w.id === windowId)
    if (index > -1) {
      windows.value.splice(index, 1)
      if (activeWindowId.value === windowId) {
        const remaining = windows.value.filter(w => !w.minimized)
        activeWindowId.value = remaining.length > 0 ? remaining[remaining.length - 1].id : null
        if (remaining.length > 0) remaining[remaining.length - 1].focused = true
      }
    }
  }

  const minimizeWindow = (windowId) => {
    const window = windows.value.find(w => w.id === windowId)
    if (window) {
      window.minimized = true
      window.focused = false
      const remaining = windows.value.filter(w => !w.minimized)
      activeWindowId.value = remaining.length > 0 ? remaining[remaining.length - 1].id : null
      if (remaining.length > 0) remaining[remaining.length - 1].focused = true
    }
  }

  const maximizeWindow = (windowId) => {
    const currentWindow = windows.value.find(w => w.id === windowId)
    if (currentWindow) {
      if (currentWindow.maximized) {
        currentWindow.maximized = false
        currentWindow.x = currentWindow.prevX || 100
        currentWindow.y = currentWindow.prevY || 100
        currentWindow.width = currentWindow.prevWidth || 900
        currentWindow.height = currentWindow.prevHeight || 600
      } else {
        currentWindow.prevX = currentWindow.x
        currentWindow.prevY = currentWindow.y
        currentWindow.prevWidth = currentWindow.width
        currentWindow.prevHeight = currentWindow.height
        currentWindow.maximized = true
        currentWindow.x = 0
        currentWindow.y = 0
        if (typeof window !== 'undefined') {
          currentWindow.width = window.innerWidth
          currentWindow.height = window.innerHeight
        }
      }
    }
  }

  const bringToFront = (windowId) => {
    const window = windows.value.find(w => w.id === windowId)
    if (window) {
      windows.value.forEach(w => w.focused = false)
      window.zIndex = ++maxZIndex.value
      window.focused = true
      window.minimized = false
      activeWindowId.value = windowId
    }
  }

  const updateWindowPosition = (windowId, x, y) => {
    const window = windows.value.find(w => w.id === windowId)
    if (window && !window.maximized) {
      window.x = x
      window.y = y
    }
  }

  const updateWindowSize = (windowId, width, height) => {
    const window = windows.value.find(w => w.id === windowId)
    if (window && !window.maximized) {
      window.width = width
      window.height = height
    }
  }

  const setShowDock = (enabled) => {
    settings.value.showDock = Boolean(enabled)
    saveSettings()
  }

  const setIconSize = (size) => {
    if (size !== 'small' && size !== 'medium' && size !== 'large') return
    settings.value.iconSize = size
    saveSettings()
  }

  const setDockPosition = (position) => {
    if (position !== 'bottom') return
    settings.value.dockPosition = position
    saveSettings()
  }

  const setWallpaper = (presetId) => {
    if (!presetId || typeof presetId !== 'string') return
    settings.value.wallpaper = presetId
    saveSettings()
  }

  const setMotionLevel = (level) => {
    if (level !== 'low' && level !== 'medium' && level !== 'high') return
    settings.value.motionLevel = level
    saveSettings()
  }

  const setCodeRainEnabled = (enabled) => {
    settings.value.codeRainEnabled = Boolean(enabled)
    saveSettings()
  }

  const setDockAnimationLevel = (level) => {
    if (level !== 'low' && level !== 'medium' && level !== 'high') return
    settings.value.dockAnimationLevel = level
    saveSettings()
  }

  const setTerminalFontSize = (size) => {
    if (size !== 'small' && size !== 'medium' && size !== 'large') return
    settings.value.terminalFontSize = size
    saveSettings()
  }

  const setTerminalHistoryLimit = (limit) => {
    if (limit !== 30 && limit !== 100 && limit !== 300) return
    settings.value.terminalHistoryLimit = limit
    saveSettings()
  }

  const setTerminalEasterEggsEnabled = (enabled) => {
    settings.value.terminalEasterEggsEnabled = Boolean(enabled)
    saveSettings()
  }

  const setAutoStartMonitoring = (enabled) => {
    settings.value.autoStartMonitoring = Boolean(enabled)
    saveSettings()

    if (settings.value.autoStartMonitoring) {
      startStatusMonitoring(settings.value.statusMonitorIntervalMs)
    } else {
      stopStatusMonitoring()
    }
  }

  const setStatusMonitorInterval = (intervalMs) => {
    if (![15000, 30000, 45000, 60000].includes(intervalMs)) return
    settings.value.statusMonitorIntervalMs = intervalMs
    saveSettings()

    if (settings.value.autoStartMonitoring) {
      stopStatusMonitoring()
      startStatusMonitoring(settings.value.statusMonitorIntervalMs)
    }
  }

  const resetSettings = () => {
    settings.value = {
      wallpaper: 'deep-net',
      wallpaperColor: '#1a1a2e',
      showDock: true,
      dockPosition: 'bottom',
      iconSize: 'medium',
      motionLevel: 'medium',
      codeRainEnabled: true,
      dockAnimationLevel: 'medium',
      terminalFontSize: 'medium',
      terminalHistoryLimit: 100,
      terminalEasterEggsEnabled: true,
      autoStartMonitoring: true,
      statusMonitorIntervalMs: 45000,
    }
    saveSettings()

    stopStatusMonitoring()
    if (settings.value.autoStartMonitoring) {
      startStatusMonitoring(settings.value.statusMonitorIntervalMs)
    }
  }

  const reorderDesktopApps = (fromAppId, toAppId) => {
    if (!fromAppId || !toAppId) return
    if (fromAppId === toAppId) return

    const fromIndex = apps.value.findIndex(app => app.id === fromAppId)
    const toIndex = apps.value.findIndex(app => app.id === toAppId)
    if (fromIndex < 0 || toIndex < 0) return

    const nextApps = [...apps.value]
    const [moved] = nextApps.splice(fromIndex, 1)
    nextApps.splice(toIndex, 0, moved)

    apps.value = nextApps
    saveAppOrder()
  }

  return {
    apps,
    windows,
    activeWindowId,
    settings,
    openWindows,
    minimizedWindows,
    serviceSummary,
    pinnedAppIds,
    recentAppIds,
    trashedAppIds,
    removedAppIds,
    pinnedApps,
    recentApps,
    desktopApps,
    trashedApps,
    trashCount,
    isMonitoringStatus,
    lastStatusCheckAt,
    openWindow,
    closeWindow,
    minimizeWindow,
    maximizeWindow,
    bringToFront,
    updateWindowPosition,
    updateWindowSize,
    setShowDock,
    setIconSize,
    setDockPosition,
    setWallpaper,
    setMotionLevel,
    setCodeRainEnabled,
    setDockAnimationLevel,
    setTerminalFontSize,
    setTerminalHistoryLimit,
    setTerminalEasterEggsEnabled,
    setAutoStartMonitoring,
    setStatusMonitorInterval,
    resetSettings,
    reorderDesktopApps,
    loadPortalState,
    loadSettings,
    togglePinnedApp,
    recordAppLaunch,
    moveAppToTrash,
    restoreAppFromTrash,
    deleteFromTrash,
    emptyTrash,
    openTrashWindow,
    checkServiceStatuses,
    startStatusMonitoring,
    stopStatusMonitoring,
  }
})
