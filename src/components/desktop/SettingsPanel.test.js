import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { useDesktopStore } from '../../stores/desktop.js'
import SettingsPanel from './SettingsPanel.vue'

let wrapper
let store

beforeEach(() => {
  window.localStorage.clear()
  const pinia = createPinia()
  setActivePinia(pinia)
  store = useDesktopStore()
  wrapper = mount(SettingsPanel, { global: { plugins: [pinia] } })
})

afterEach(() => {
  wrapper.unmount()
  store.stopStatusMonitoring()
  vi.restoreAllMocks()
})

const category = name => wrapper.get(`.settings-nav-item[aria-label="${name}"]`).trigger('click')

describe('system settings', () => {
  it('switches pages and saves real Dock controls across store reload', async () => {
    await category('桌面与程序坞')
    expect(wrapper.get('h1').text()).toBe('桌面与程序坞')
    await wrapper.get('[aria-label="程序坞大小"]').setValue('2')
    await wrapper.get('[aria-label="程序坞放大效果"]').setValue('0')
    await wrapper.get('[role="switch"][aria-label="显示程序坞"]').trigger('click')
    expect(store.settings.iconSize).toBe('large')
    expect(store.settings.dockAnimationLevel).toBe('low')
    expect(store.settings.showDock).toBe(false)
    setActivePinia(createPinia())
    const restored = useDesktopStore()
    restored.loadSettings()
    expect(restored.settings.iconSize).toBe('large')
    expect(restored.settings.dockAnimationLevel).toBe('low')
    expect(restored.settings.showDock).toBe(false)
  })

  it('searches setting names and shows a useful empty state', async () => {
    const search = wrapper.get('[aria-label="搜索设置"]')
    await search.setValue('字体大小')
    expect(wrapper.findAll('.settings-nav-item').map(item => item.text())).toEqual(['终端'])
    await category('终端')
    expect(wrapper.get('h1').text()).toBe('终端')
    await search.setValue('不存在的设置')
    expect(wrapper.findAll('.settings-nav-item')).toHaveLength(0)
    expect(wrapper.get('.settings-no-results').text()).toBe('没有找到相关设置')
    await search.setValue('')
    expect(wrapper.findAll('.settings-nav-item')).toHaveLength(6)
  })

  it('changes appearance and wallpaper with accessible selected states and a valid image preview', async () => {
    await category('外观')
    const dark = wrapper.get('.settings-appearance-options button:last-child')
    await dark.trigger('click')
    expect(dark.attributes('aria-pressed')).toBe('true')
    expect(wrapper.classes()).toContain('settings-dark')
    await category('墙纸')
    const wallpapers = wrapper.findAll('.wallpaper-option')
    expect(wallpapers[0].element.style.backgroundImage).toContain('/wallpapers/gmlhub-aurora-ribbon.png')
    await wallpapers[2].trigger('click')
    expect(store.settings.wallpaper).toBe('quantum-green')
    expect(wallpapers[2].attributes('aria-pressed')).toBe('true')
    expect(wallpapers[0].attributes('aria-pressed')).toBe('false')
  })

  it('exposes the real service-check pending state and terminal settings', async () => {
    await category('服务状态')
    store.isMonitoringStatus = true
    await wrapper.vm.$nextTick()
    expect(wrapper.get('.settings-action').attributes('disabled')).toBeDefined()
    expect(wrapper.get('.settings-action').text()).toBe('正在检查…')
    await category('终端')
    await wrapper.get('[role="switch"]').trigger('click')
    expect(store.settings.terminalEasterEggsEnabled).toBe(false)
    const history = wrapper.get('[aria-label="命令历史记录"]')
    await history.findAll('button')[2].trigger('click')
    expect(store.settings.terminalHistoryLimit).toBe(300)
  })
})
