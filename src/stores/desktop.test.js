import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useDesktopStore } from './desktop.js'

describe('desktop store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    window.localStorage.clear()
    vi.restoreAllMocks()
  })

  it('opens external apps in new tab and keeps terminal in local window', () => {
    const store = useDesktopStore()
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null)

    store.openWindow('tools')
    expect(openSpy).toHaveBeenCalledWith('https://tools.gmlhub.top', '_blank', 'noopener,noreferrer')
    expect(store.windows).toHaveLength(0)

    store.openWindow('terminal')
    expect(store.windows).toHaveLength(1)
    expect(store.windows[0].appId).toBe('terminal')
  })

  it('moves app to trash and restores it', () => {
    const store = useDesktopStore()

    expect(store.desktopApps.some(app => app.id === 'blog')).toBe(true)

    store.moveAppToTrash('blog')
    expect(store.trashedApps.some(app => app.id === 'blog')).toBe(true)
    expect(store.desktopApps.some(app => app.id === 'blog')).toBe(false)

    store.restoreAppFromTrash('blog')
    expect(store.trashedApps.some(app => app.id === 'blog')).toBe(false)
    expect(store.desktopApps.some(app => app.id === 'blog')).toBe(true)
  })

  it('persists settings and reloads from storage', () => {
    const store = useDesktopStore()

    store.setMotionLevel('high')
    store.setTerminalHistoryLimit(300)
    store.setCodeRainEnabled(false)
    store.setShowServiceReadout(false)

    setActivePinia(createPinia())
    const nextStore = useDesktopStore()
    nextStore.loadSettings()

    expect(nextStore.settings.motionLevel).toBe('high')
    expect(nextStore.settings.terminalHistoryLimit).toBe(300)
    expect(nextStore.settings.codeRainEnabled).toBe(false)
    expect(nextStore.settings.showServiceReadout).toBe(false)
  })

  it('restarts monitor timer when interval setting changes', () => {
    const store = useDesktopStore()
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({})

    const setIntervalSpy = vi.spyOn(window, 'setInterval').mockReturnValue(321)
    const clearIntervalSpy = vi.spyOn(window, 'clearInterval').mockImplementation(() => {})

    store.setAutoStartMonitoring(false)
    setIntervalSpy.mockClear()
    clearIntervalSpy.mockClear()

    store.setAutoStartMonitoring(true)
    expect(setIntervalSpy).toHaveBeenCalledTimes(1)
    expect(setIntervalSpy).toHaveBeenLastCalledWith(expect.any(Function), 45000)

    store.setStatusMonitorInterval(30000)
    expect(clearIntervalSpy).toHaveBeenCalledWith(321)
    expect(setIntervalSpy).toHaveBeenCalledTimes(2)
    expect(setIntervalSpy).toHaveBeenLastCalledWith(expect.any(Function), 30000)
    store.stopStatusMonitoring()
  })

  it('uses explicit reachability semantics for remote service checks', async () => {
    const store = useDesktopStore()
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({})

    expect(store.serviceSummary.unknown).toBe(7)
    await store.checkServiceStatuses()

    expect(store.serviceSummary.reachable).toBe(7)
    expect(store.serviceSummary.unreachable).toBe(0)
    expect(store.apps.find(app => app.id === 'tools').status).toBe('reachable')
  })

  it('migrates legacy localStorage keys into the versioned portal state', () => {
    window.localStorage.setItem('desktop.settings', JSON.stringify({ motionLevel: 'low' }))
    const store = useDesktopStore()

    store.loadPortalState()

    expect(store.settings.motionLevel).toBe('low')
    expect(window.localStorage.getItem('gmlhub.portal.state')).toContain('schemaVersion')
  })

  it('restores a minimized window instead of creating a duplicate', () => {
    const store = useDesktopStore()

    store.openWindow('terminal')
    const windowId = store.windows[0].id
    store.minimizeWindow(windowId)
    store.openWindow('terminal')

    expect(store.windows).toHaveLength(1)
    expect(store.windows[0].minimized).toBe(false)
    expect(store.activeWindowId).toBe(windowId)
    expect(store.windows[0].focused).toBe(true)
  })

  it('chooses the highest z-index window when the active window closes', () => {
    const store = useDesktopStore()

    store.openWindow('terminal')
    store.openWindow('settings')
    const terminalId = store.windows.find(window => window.appId === 'terminal').id
    const settingsId = store.windows.find(window => window.appId === 'settings').id

    store.bringToFront(terminalId)
    store.closeWindow(terminalId)

    expect(store.activeWindowId).toBe(settingsId)
    expect(store.windows.find(window => window.id === settingsId).focused).toBe(true)
  })

  it('clamps dragging and resizing to the usable viewport', () => {
    const store = useDesktopStore()
    store.openWindow('terminal')
    const windowId = store.windows[0].id

    store.updateWindowPosition(windowId, -1000, -1000)
    expect(store.windows[0].x).toBeGreaterThanOrEqual(8)
    expect(store.windows[0].y).toBeGreaterThanOrEqual(48)

    store.updateWindowSize(windowId, 10000, 10000)
    expect(store.windows[0].x + store.windows[0].width).toBeLessThanOrEqual(window.innerWidth - 8)
    expect(store.windows[0].y + store.windows[0].height).toBeLessThanOrEqual(window.innerHeight - 88)
  })

  it('persists and restores internal window geometry', () => {
    const store = useDesktopStore()
    store.openWindow('terminal')
    const windowId = store.windows[0].id
    store.updateWindowPosition(windowId, 80, 60)
    store.persistWindowState()

    setActivePinia(createPinia())
    const nextStore = useDesktopStore()
    nextStore.loadPortalState()

    expect(nextStore.windows).toHaveLength(1)
    expect(nextStore.windows[0].appId).toBe('terminal')
    expect(nextStore.windows[0].x).toBe(80)
    expect(nextStore.windows[0].y).toBe(60)
  })
})
