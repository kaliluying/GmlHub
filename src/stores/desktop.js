import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useDesktopStore = defineStore('desktop', () => {
  const PINNED_APPS_STORAGE_KEY = 'desktop.pinnedApps'
  const RECENT_APPS_STORAGE_KEY = 'desktop.recentApps'
  const SETTINGS_STORAGE_KEY = 'desktop.settings'

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
      description: '实用工具集合',
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
      description: '个人知识管理',
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
      description: '安全密码管理',
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
      description: '技术博客',
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
  ])

  // 窗口状态
  const windows = ref([])
  const activeWindowId = ref(null)
  const maxZIndex = ref(100)
  const pinnedAppIds = ref([])
  const recentAppIds = ref([])
  const isMonitoringStatus = ref(false)
  const lastStatusCheckAt = ref(null)

  let statusMonitorTimer = null

  // 桌面设置
  const settings = ref({
    darkMode: false,
    wallpaper: 'deep-net',
    wallpaperColor: '#1a1a2e',
    showDock: true,
    dockPosition: 'bottom',
    iconSize: 'medium', // small, medium, large
    motionLevel: 'medium',
    codeRainEnabled: true,
    dockAnimationLevel: 'medium',
    terminalFontSize: 'medium', // small, medium, large
    terminalHistoryLimit: 100,
    terminalEasterEggsEnabled: true,
    autoStartMonitoring: true,
    statusMonitorIntervalMs: 45000,
  })

  // 计算属性
  const openWindows = computed(() => windows.value.filter(w => !w.minimized))
  const minimizedWindows = computed(() => windows.value.filter(w => w.minimized))
  const isDarkMode = computed(() => settings.value.darkMode)
  const serviceSummary = computed(() => {
    const online = apps.value.filter(app => app.status === 'online').length
    const offline = apps.value.filter(app => app.status === 'offline').length

    return {
      online,
      offline,
      total: apps.value.length,
    }
  })

  const pinnedApps = computed(() => {
    const appMap = new Map(apps.value.map(app => [app.id, app]))
    return pinnedAppIds.value.map(id => appMap.get(id)).filter(Boolean)
  })

  const recentApps = computed(() => {
    const appMap = new Map(apps.value.map(app => [app.id, app]))
    return recentAppIds.value.map(id => appMap.get(id)).filter(Boolean)
  })

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

    loadSettings()
  }

  const loadSettings = () => {
    if (typeof window === 'undefined') return

    const defaults = {
      darkMode: false,
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
        darkMode: typeof parsed.darkMode === 'boolean' ? parsed.darkMode : defaults.darkMode,
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
  const openWindow = (appId) => {
    const app = apps.value.find(a => a.id === appId)
    if (!app) return

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

    const newWindow = {
      id: `window-${Date.now()}`,
      appId: app.id,
      title: app.name,
      icon: app.icon,
      url: app.url,
      x: 100 + (windows.value.length * 30),
      y: 100 + (windows.value.length * 30),
      width: 900,
      height: 600,
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

  const toggleDarkMode = () => {
    settings.value.darkMode = !settings.value.darkMode
    saveSettings()
  }

  const setDarkMode = (enabled) => {
    settings.value.darkMode = Boolean(enabled)
    saveSettings()
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
      darkMode: false,
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

  return {
    apps,
    windows,
    activeWindowId,
    settings,
    openWindows,
    minimizedWindows,
    isDarkMode,
    serviceSummary,
    pinnedAppIds,
    recentAppIds,
    pinnedApps,
    recentApps,
    isMonitoringStatus,
    lastStatusCheckAt,
    openWindow,
    closeWindow,
    minimizeWindow,
    maximizeWindow,
    bringToFront,
    updateWindowPosition,
    updateWindowSize,
    toggleDarkMode,
    setDarkMode,
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
    loadPortalState,
    loadSettings,
    togglePinnedApp,
    recordAppLaunch,
    checkServiceStatuses,
    startStatusMonitoring,
    stopStatusMonitoring,
  }
})
