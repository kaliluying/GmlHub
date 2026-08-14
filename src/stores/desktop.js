import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { getInitialApps } from '../config/apps.js'
import { createDefaultSettings, normalizeSettings } from '../config/settings.js'
import {
  loadPortalState as readPortalState,
  savePortalState as writePortalState,
} from '../services/persistence.js'

const MOBILE_WINDOW_APPS = new Set(['terminal', 'settings', 'profile', 'contact', 'stack', 'project'])

export const useDesktopStore = defineStore('desktop', () => {
  const apps = ref(getInitialApps())
  const windows = ref([])
  const activeWindowId = ref(null)
  const maxZIndex = ref(100)
  const pinnedAppIds = ref([])
  const recentAppIds = ref([])
  const trashedAppIds = ref([])
  const removedAppIds = ref([])
  const isMonitoringStatus = ref(false)
  const lastStatusCheckAt = ref(null)
  const settings = ref(createDefaultSettings())

  let statusMonitorTimer = null
  let statusMonitorController = null
  let windowSequence = 0

  const openWindows = computed(() => windows.value.filter(window => !window.minimized))
  const minimizedWindows = computed(() => windows.value.filter(window => window.minimized))

  const serviceSummary = computed(() => {
    const remoteApps = apps.value.filter(app => app.launchMode === 'external' && app.url)
    const reachable = remoteApps.filter(app => app.status === 'reachable').length
    const unreachable = remoteApps.filter(app => app.status === 'unreachable').length
    const unknown = remoteApps.filter(app => app.status === 'unknown').length
    const local = apps.value.filter(app => app.launchMode === 'internal').length

    return {
      reachable,
      unreachable,
      unknown,
      local,
      total: remoteApps.length,
      // Compatibility aliases for existing panels and terminal commands.
      online: reachable,
      offline: unreachable,
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

  const desktopApps = computed(() => apps.value.filter(app => (
    !trashedAppIds.value.includes(app.id) && !removedAppIds.value.includes(app.id)
  )))

  const trashedApps = computed(() => apps.value.filter(app => trashedAppIds.value.includes(app.id)))
  const trashCount = computed(() => trashedAppIds.value.length)

  const nextWindowId = () => {
    windowSequence += 1
    return `window-${Date.now()}-${windowSequence}`
  }

  const isCompactMobileViewport = () => {
    if (typeof window === 'undefined') return false
    return window.innerWidth < 768
  }

  const getViewportBounds = () => {
    if (typeof window === 'undefined') {
      return {
        left: 20,
        top: 56,
        right: 1260,
        bottom: 704,
      }
    }

    const mobile = isCompactMobileViewport()
    const horizontalPadding = mobile ? 8 : 20
    const topOffset = mobile ? 48 : 56
    const bottomOffset = settings.value.showDock ? (mobile ? 88 : 96) : (mobile ? 16 : 20)
    const viewportWidth = Math.max(1, window.innerWidth)
    const viewportHeight = Math.max(1, window.innerHeight)

    return {
      left: horizontalPadding,
      top: topOffset,
      right: Math.max(horizontalPadding, viewportWidth - horizontalPadding),
      bottom: Math.max(topOffset + 1, viewportHeight - bottomOffset),
    }
  }

  const getMinimumWindowSize = (appId) => {
    if (isCompactMobileViewport()) {
      return MOBILE_WINDOW_APPS.has(appId)
        ? { width: 240, height: 260 }
        : { width: 240, height: 260 }
    }

    return { width: 400, height: 300 }
  }

  const clampWindowFrame = (appId, frame) => {
    const bounds = getViewportBounds()
    const minimum = getMinimumWindowSize(appId)
    const availableWidth = Math.max(1, bounds.right - bounds.left)
    const availableHeight = Math.max(1, bounds.bottom - bounds.top)
    const minWidth = Math.min(minimum.width, availableWidth)
    const minHeight = Math.min(minimum.height, availableHeight)
    const width = Math.min(availableWidth, Math.max(minWidth, Number(frame.width) || minimum.width))
    const height = Math.min(availableHeight, Math.max(minHeight, Number(frame.height) || minimum.height))
    const maxX = Math.max(bounds.left, bounds.right - width)
    const maxY = Math.max(bounds.top, bounds.bottom - height)
    const requestedX = Number(frame.x)
    const requestedY = Number(frame.y)

    return {
      x: Math.min(maxX, Math.max(bounds.left, Number.isFinite(requestedX) ? requestedX : bounds.left)),
      y: Math.min(maxY, Math.max(bounds.top, Number.isFinite(requestedY) ? requestedY : bounds.top)),
      width,
      height,
    }
  }

  const getCenteredWindowFrame = (appId, { width, height }) => {
    const bounds = getViewportBounds()
    const requestedWidth = Math.min(width, bounds.right - bounds.left)
    const requestedHeight = Math.min(height, bounds.bottom - bounds.top)
    return clampWindowFrame(appId, {
      x: bounds.left + ((bounds.right - bounds.left - requestedWidth) / 2),
      y: bounds.top + ((bounds.bottom - bounds.top - requestedHeight) / 2),
      width: requestedWidth,
      height: requestedHeight,
    })
  }

  const buildWindowFrame = (appId, index, size = { width: 900, height: 600 }) => {
    if (isCompactMobileViewport() && MOBILE_WINDOW_APPS.has(appId)) {
      const bounds = getViewportBounds()
      return clampWindowFrame(appId, {
        x: bounds.left,
        y: bounds.top,
        width: bounds.right - bounds.left,
        height: bounds.bottom - bounds.top,
      })
    }

    const centeredFrame = getCenteredWindowFrame(appId, size)
    if (centeredFrame) return centeredFrame

    return clampWindowFrame(appId, {
      x: 100 + (index * 30),
      y: 100 + (index * 30),
      width: size.width,
      height: size.height,
    })
  }

  const getMaximizedWindowFrame = (appId) => {
    const bounds = getViewportBounds()
    return {
      x: bounds.left,
      y: bounds.top,
      width: bounds.right - bounds.left,
      height: bounds.bottom - bounds.top,
    }
  }

  const getTopVisibleWindow = () => windows.value
    .filter(window => !window.minimized)
    .sort((a, b) => b.zIndex - a.zIndex)[0] || null

  const focusTopWindow = () => {
    const topWindow = getTopVisibleWindow()
    windows.value = windows.value.map(window => ({
      ...window,
      focused: Boolean(topWindow && window.id === topWindow.id),
    }))
    activeWindowId.value = topWindow?.id || null
    return topWindow
  }

  const createWindowRecord = (app, frame, snapshot = {}) => ({
    id: snapshot.id || nextWindowId(),
    appId: app.id,
    title: app.name,
    icon: app.icon,
    description: app.description,
    detailTitle: app.detailTitle,
    details: app.details,
    quickFacts: app.quickFacts,
    evidence: app.evidence,
    actions: app.actions,
    content: app.content,
    stack: app.stack,
    repoUrl: app.repoUrl,
    demoUrl: app.demoUrl,
    launchMode: app.launchMode,
    pluginId: app.pluginId || app.id,
    url: app.url,
    ...frame,
    zIndex: Number.isFinite(snapshot.zIndex) ? snapshot.zIndex : ++maxZIndex.value,
    minimized: Boolean(snapshot.minimized),
    maximized: Boolean(snapshot.maximized),
    focused: false,
    prevX: Number.isFinite(snapshot.prevX) ? snapshot.prevX : frame.x,
    prevY: Number.isFinite(snapshot.prevY) ? snapshot.prevY : frame.y,
    prevWidth: Number.isFinite(snapshot.prevWidth) ? snapshot.prevWidth : frame.width,
    prevHeight: Number.isFinite(snapshot.prevHeight) ? snapshot.prevHeight : frame.height,
  })

  const serializeWindow = (window) => ({
    id: window.id,
    appId: window.appId,
    x: window.x,
    y: window.y,
    width: window.width,
    height: window.height,
    zIndex: window.zIndex,
    minimized: window.minimized,
    maximized: window.maximized,
    prevX: window.prevX,
    prevY: window.prevY,
    prevWidth: window.prevWidth,
    prevHeight: window.prevHeight,
  })

  const persistPortalState = () => {
    writePortalState({
      pinnedAppIds: pinnedAppIds.value,
      recentAppIds: recentAppIds.value,
      trashedAppIds: trashedAppIds.value,
      removedAppIds: removedAppIds.value,
      appOrder: apps.value.map(app => app.id),
      settings: settings.value,
      windows: windows.value
        .filter(window => window.launchMode === 'internal' && window.appId !== 'trash' && window.pluginId !== 'project')
        .map(serializeWindow),
    })
  }

  const persistWindowState = () => {
    persistPortalState()
  }

  const loadSettings = () => {
    const state = readPortalState({ validAppIds: new Set(apps.value.map(app => app.id)) })
    settings.value = normalizeSettings(state.settings)
  }

  const loadPortalState = () => {
    const validAppIds = new Set(apps.value.map(app => app.id))
    const state = readPortalState({ validAppIds })

    pinnedAppIds.value = state.pinnedAppIds
    recentAppIds.value = state.recentAppIds
    trashedAppIds.value = state.trashedAppIds
    removedAppIds.value = state.removedAppIds
    settings.value = normalizeSettings(state.settings)

    if (state.appOrder.length) {
      const orderMap = new Map(state.appOrder.map((id, index) => [id, index]))
      apps.value = [...apps.value].sort((a, b) => {
        const aIndex = orderMap.has(a.id) ? orderMap.get(a.id) : Number.MAX_SAFE_INTEGER
        const bIndex = orderMap.has(b.id) ? orderMap.get(b.id) : Number.MAX_SAFE_INTEGER
        return aIndex - bIndex
      })
    }

    const internalApps = new Map(apps.value
      .filter(app => app.launchMode === 'internal')
      .map(app => [app.id, app]))
    const restoredWindows = state.windows
      .filter(snapshot => internalApps.has(snapshot.appId))
      .map(snapshot => {
        const app = internalApps.get(snapshot.appId)
        const frame = snapshot.maximized
          ? getMaximizedWindowFrame(app.id)
          : clampWindowFrame(app.id, snapshot)
        return createWindowRecord(app, frame, snapshot)
      })

    windows.value = restoredWindows
    maxZIndex.value = Math.max(100, ...restoredWindows.map(window => window.zIndex))
    focusTopWindow()
  }

  const togglePinnedApp = (appId) => {
    if (!apps.value.some(app => app.id === appId)) return
    if (pinnedAppIds.value.includes(appId)) {
      pinnedAppIds.value = pinnedAppIds.value.filter(id => id !== appId)
    } else {
      pinnedAppIds.value = [appId, ...pinnedAppIds.value].slice(0, 8)
    }
    persistPortalState()
  }

  const recordAppLaunch = (appId) => {
    recentAppIds.value = [appId, ...recentAppIds.value.filter(id => id !== appId)].slice(0, 8)
    persistPortalState()
  }

  const sanitizeAppFromQuickLists = (appId) => {
    pinnedAppIds.value = pinnedAppIds.value.filter(id => id !== appId)
    recentAppIds.value = recentAppIds.value.filter(id => id !== appId)
  }

  const closeWindowsByAppId = (appId) => {
    const closingIds = windows.value.filter(window => window.appId === appId).map(window => window.id)
    if (!closingIds.length) return
    windows.value = windows.value.filter(window => window.appId !== appId)
    if (activeWindowId.value && closingIds.includes(activeWindowId.value)) focusTopWindow()
    persistPortalState()
  }

  const canTrashApp = (appId) => appId !== 'terminal' && appId !== 'settings'

  const moveAppToTrash = (appId) => {
    const app = apps.value.find(item => item.id === appId)
    if (!app || !canTrashApp(appId)) return
    if (trashedAppIds.value.includes(appId) || removedAppIds.value.includes(appId)) return

    trashedAppIds.value = [appId, ...trashedAppIds.value.filter(id => id !== appId)]
    sanitizeAppFromQuickLists(appId)
    closeWindowsByAppId(appId)
    persistPortalState()
  }

  const restoreAppFromTrash = (appId) => {
    if (!trashedAppIds.value.includes(appId)) return
    trashedAppIds.value = trashedAppIds.value.filter(id => id !== appId)
    persistPortalState()
  }

  const deleteFromTrash = (appId) => {
    if (!trashedAppIds.value.includes(appId)) return
    trashedAppIds.value = trashedAppIds.value.filter(id => id !== appId)
    removedAppIds.value = [appId, ...removedAppIds.value.filter(id => id !== appId)]
    sanitizeAppFromQuickLists(appId)
    closeWindowsByAppId(appId)
    persistPortalState()
  }

  const emptyTrash = () => {
    if (!trashedAppIds.value.length) return
    const toDelete = [...trashedAppIds.value]
    trashedAppIds.value = []
    removedAppIds.value = [...new Set([...toDelete, ...removedAppIds.value])]
    toDelete.forEach(appId => sanitizeAppFromQuickLists(appId))
    windows.value = windows.value.filter(window => !toDelete.includes(window.appId))
    focusTopWindow()
    persistPortalState()
  }

  const openTrashWindow = () => {
    const existingWindow = windows.value.find(window => window.appId === 'trash')
    if (existingWindow) {
      bringToFront(existingWindow.id)
      return
    }

    const frame = buildWindowFrame('trash', windows.value.length, { width: 820, height: 560 })
    const newWindow = {
      id: nextWindowId(),
      appId: 'trash',
      title: '废纸篓',
      icon: '🗑️',
      url: null,
      launchMode: 'internal',
      pluginId: 'trash',
      x: frame.x,
      y: frame.y,
      width: frame.width,
      height: frame.height,
      zIndex: ++maxZIndex.value,
      minimized: false,
      maximized: false,
      focused: true,
    }

    windows.value = [...windows.value.map(window => ({ ...window, focused: false })), newWindow]
    activeWindowId.value = newWindow.id
  }

  const openWindow = (appId) => {
    const app = apps.value.find(item => item.id === appId)
    if (!app || trashedAppIds.value.includes(appId) || removedAppIds.value.includes(appId)) return

    const shouldNavigate = app.launchMode === 'external' || (!app.launchMode && app.url)
    if (shouldNavigate) {
      if (typeof window !== 'undefined') window.open(app.url, '_blank', 'noopener,noreferrer')
      recordAppLaunch(appId)
      return
    }

    const existingWindow = windows.value.find(window => window.appId === appId)
    if (existingWindow) {
      bringToFront(existingWindow.id)
      recordAppLaunch(appId)
      return
    }

    const frame = buildWindowFrame(appId, windows.value.length)
    const newWindow = createWindowRecord(app, frame)
    windows.value = [
      ...windows.value.map(window => ({ ...window, focused: false })),
      { ...newWindow, focused: true },
    ]
    activeWindowId.value = newWindow.id
    recordAppLaunch(appId)
    persistPortalState()
  }

  const openProjectDetails = (appId) => {
    const app = apps.value.find(item => item.id === appId)
    if (!app || (!app.repoUrl && !app.content && !app.stack?.length)) return

    const existingWindow = windows.value.find(window => (
      window.pluginId === 'project' && window.projectAppId === appId
    ))
    if (existingWindow) {
      bringToFront(existingWindow.id)
      return
    }

    const frame = buildWindowFrame('project', windows.value.length, { width: 760, height: 600 })
    const newWindow = {
      id: nextWindowId(),
      appId: 'project',
      projectAppId: app.id,
      title: `${app.name} · 项目页`,
      icon: app.icon,
      description: app.description,
      content: app.content,
      stack: app.stack,
      repoUrl: app.repoUrl,
      demoUrl: app.demoUrl || app.url,
      status: app.status,
      launchMode: 'internal',
      pluginId: 'project',
      url: null,
      ...frame,
      zIndex: ++maxZIndex.value,
      minimized: false,
      maximized: false,
      focused: true,
    }

    windows.value = [
      ...windows.value.map(window => ({ ...window, focused: false })),
      newWindow,
    ]
    activeWindowId.value = newWindow.id
  }

  const closeWindow = (windowId) => {
    const closingWindow = windows.value.find(window => window.id === windowId)
    if (!closingWindow) return

    const wasActive = activeWindowId.value === windowId
    windows.value = windows.value.filter(window => window.id !== windowId)
    if (wasActive) focusTopWindow()
    persistPortalState()
  }

  const minimizeWindow = (windowId) => {
    const index = windows.value.findIndex(window => window.id === windowId)
    if (index < 0) return

    const wasActive = activeWindowId.value === windowId
    windows.value[index] = { ...windows.value[index], minimized: true, focused: false }
    if (wasActive) focusTopWindow()
    persistPortalState()
  }

  const maximizeWindow = (windowId) => {
    const index = windows.value.findIndex(window => window.id === windowId)
    if (index < 0) return

    const currentWindow = windows.value[index]
    if (currentWindow.maximized) {
      const restored = clampWindowFrame(currentWindow.appId, {
        x: currentWindow.prevX ?? 100,
        y: currentWindow.prevY ?? 100,
        width: currentWindow.prevWidth ?? 900,
        height: currentWindow.prevHeight ?? 600,
      })
      windows.value[index] = { ...currentWindow, ...restored, maximized: false }
    } else {
      windows.value[index] = {
        ...currentWindow,
        ...getMaximizedWindowFrame(currentWindow.appId),
        prevX: currentWindow.x,
        prevY: currentWindow.y,
        prevWidth: currentWindow.width,
        prevHeight: currentWindow.height,
        maximized: true,
      }
    }

    bringToFront(windowId)
    persistPortalState()
  }

  const bringToFront = (windowId) => {
    const index = windows.value.findIndex(window => window.id === windowId)
    if (index < 0) return

    maxZIndex.value += 1
    windows.value = windows.value.map((window, currentIndex) => currentIndex === index
      ? { ...window, zIndex: maxZIndex.value, focused: true, minimized: false }
      : { ...window, focused: false })
    activeWindowId.value = windowId
    persistPortalState()
  }

  const updateWindowPosition = (windowId, x, y) => {
    const index = windows.value.findIndex(window => window.id === windowId)
    if (index < 0) return
    const currentWindow = windows.value[index]
    if (currentWindow.maximized) return
    const frame = clampWindowFrame(currentWindow.appId, { ...currentWindow, x, y })
    windows.value[index] = { ...currentWindow, ...frame }
  }

  const updateWindowSize = (windowId, width, height) => {
    const index = windows.value.findIndex(window => window.id === windowId)
    if (index < 0) return
    const currentWindow = windows.value[index]
    if (currentWindow.maximized) return
    const frame = clampWindowFrame(currentWindow.appId, { ...currentWindow, width, height })
    windows.value[index] = { ...currentWindow, ...frame }
  }

  const resizeWindowsToViewport = () => {
    windows.value = windows.value.map(window => {
      if (window.maximized) return { ...window, ...getMaximizedWindowFrame(window.appId) }
      const frame = clampWindowFrame(window.appId, window)
      const restoredFrame = clampWindowFrame(window.appId, {
        x: window.prevX,
        y: window.prevY,
        width: window.prevWidth,
        height: window.prevHeight,
      })
      return {
        ...window,
        ...frame,
        prevX: restoredFrame.x,
        prevY: restoredFrame.y,
        prevWidth: restoredFrame.width,
        prevHeight: restoredFrame.height,
      }
    })
    persistPortalState()
  }

  const setShowDock = (enabled) => {
    settings.value.showDock = Boolean(enabled)
    resizeWindowsToViewport()
    persistPortalState()
  }

  const setShowServiceReadout = (enabled) => {
    settings.value.showServiceReadout = Boolean(enabled)
    persistPortalState()
  }

  const setIconSize = (size) => {
    if (!['small', 'medium', 'large'].includes(size)) return
    settings.value.iconSize = size
    persistPortalState()
  }

  const setDockPosition = (position) => {
    if (position !== 'bottom') return
    settings.value.dockPosition = position
    persistPortalState()
  }

  const setWallpaper = (presetId) => {
    if (!presetId || typeof presetId !== 'string') return
    settings.value.wallpaper = presetId
    persistPortalState()
  }

  const setMotionLevel = (level) => {
    if (!['low', 'medium', 'high'].includes(level)) return
    settings.value.motionLevel = level
    persistPortalState()
  }

  const setCodeRainEnabled = (enabled) => {
    settings.value.codeRainEnabled = Boolean(enabled)
    persistPortalState()
  }

  const setDockAnimationLevel = (level) => {
    if (!['low', 'medium', 'high'].includes(level)) return
    settings.value.dockAnimationLevel = level
    persistPortalState()
  }

  const setTerminalFontSize = (size) => {
    if (!['small', 'medium', 'large'].includes(size)) return
    settings.value.terminalFontSize = size
    persistPortalState()
  }

  const setTerminalHistoryLimit = (limit) => {
    if (![30, 100, 300].includes(limit)) return
    settings.value.terminalHistoryLimit = limit
    persistPortalState()
  }

  const setTerminalEasterEggsEnabled = (enabled) => {
    settings.value.terminalEasterEggsEnabled = Boolean(enabled)
    persistPortalState()
  }

  const setAutoStartMonitoring = (enabled) => {
    settings.value.autoStartMonitoring = Boolean(enabled)
    persistPortalState()
    if (settings.value.autoStartMonitoring) startStatusMonitoring(settings.value.statusMonitorIntervalMs)
    else stopStatusMonitoring()
  }

  const setStatusMonitorInterval = (intervalMs) => {
    if (![15000, 30000, 45000, 60000].includes(intervalMs)) return
    settings.value.statusMonitorIntervalMs = intervalMs
    persistPortalState()
    if (settings.value.autoStartMonitoring) {
      stopStatusMonitoring()
      startStatusMonitoring(settings.value.statusMonitorIntervalMs)
    }
  }

  const resetSettings = () => {
    settings.value = createDefaultSettings()
    persistPortalState()
    stopStatusMonitoring()
    if (settings.value.autoStartMonitoring) startStatusMonitoring(settings.value.statusMonitorIntervalMs)
  }

  const reorderDesktopApps = (fromAppId, toAppId) => {
    if (!fromAppId || !toAppId || fromAppId === toAppId) return
    const fromIndex = apps.value.findIndex(app => app.id === fromAppId)
    const toIndex = apps.value.findIndex(app => app.id === toAppId)
    if (fromIndex < 0 || toIndex < 0) return

    const nextApps = [...apps.value]
    const [moved] = nextApps.splice(fromIndex, 1)
    nextApps.splice(toIndex, 0, moved)
    apps.value = nextApps
    persistPortalState()
  }

  const probeUrl = async (url, timeoutMs = 6000, signal) => {
    if (typeof window === 'undefined') return false
    const controller = new AbortController()
    const abort = () => controller.abort()
    const timeout = window.setTimeout(() => controller.abort(), timeoutMs)
    if (signal) {
      if (signal.aborted) return false
      signal.addEventListener('abort', abort, { once: true })
    }

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
      signal?.removeEventListener('abort', abort)
    }
  }

  const checkServiceStatuses = async () => {
    if (typeof window === 'undefined' || isMonitoringStatus.value) return

    const controller = new AbortController()
    statusMonitorController = controller
    isMonitoringStatus.value = true

    try {
      await Promise.all(apps.value.map(async (app) => {
        if (app.launchMode !== 'external' || !app.healthUrl && !app.url) return
        const reachable = await probeUrl(app.healthUrl || app.url, 6000, controller.signal)
        if (controller.signal.aborted) return
        app.status = reachable ? 'reachable' : 'unreachable'
        app.updatedAt = new Date().toISOString()
      }))
      if (!controller.signal.aborted) {
        lastStatusCheckAt.value = Date.now()
        persistPortalState()
      }
    } finally {
      if (statusMonitorController === controller) statusMonitorController = null
      isMonitoringStatus.value = false
    }
  }

  const startStatusMonitoring = (intervalMs = settings.value.statusMonitorIntervalMs) => {
    if (typeof window === 'undefined' || statusMonitorTimer) return
    checkServiceStatuses()
    statusMonitorTimer = window.setInterval(checkServiceStatuses, intervalMs)
  }

  const stopStatusMonitoring = () => {
    if (typeof window === 'undefined') return
    if (statusMonitorTimer) window.clearInterval(statusMonitorTimer)
    statusMonitorTimer = null
    statusMonitorController?.abort()
    statusMonitorController = null
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
    persistWindowState,
    openWindow,
    openProjectDetails,
    closeWindow,
    minimizeWindow,
    maximizeWindow,
    bringToFront,
    updateWindowPosition,
    updateWindowSize,
    resizeWindowsToViewport,
    setShowDock,
    setShowServiceReadout,
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
