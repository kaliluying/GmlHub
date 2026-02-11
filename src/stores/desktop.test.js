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
    expect(openSpy).toHaveBeenCalledWith('https://tools.gmlblog.top', '_blank', 'noopener,noreferrer')
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

    setActivePinia(createPinia())
    const nextStore = useDesktopStore()
    nextStore.loadSettings()

    expect(nextStore.settings.motionLevel).toBe('high')
    expect(nextStore.settings.terminalHistoryLimit).toBe(300)
    expect(nextStore.settings.codeRainEnabled).toBe(false)
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
  })
})
