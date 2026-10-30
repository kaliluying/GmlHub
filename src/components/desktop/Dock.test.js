import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { useDesktopStore } from '../../stores/desktop.js'
import Dock from './Dock.vue'

let wrapper
let pinia

beforeEach(() => {
  pinia = createPinia()
  setActivePinia(pinia)
  window.localStorage.clear()
  vi.stubGlobal('matchMedia', vi.fn(query => ({ matches: query === '(hover: hover)' })))
  vi.stubGlobal('requestAnimationFrame', vi.fn(callback => { callback(); return 1 }))
})

afterEach(() => {
  wrapper?.unmount()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('native-style Dock', () => {
  it('keeps only the most-used apps while preserving internal and external launch behavior', async () => {
    const store = useDesktopStore()
    const openSpy = vi.spyOn(window, 'open').mockReturnValue(null)
    wrapper = mount(Dock, { global: { plugins: [pinia] } })
    const names = wrapper.findAll('[role="button"]').map(button => button.attributes('aria-label'))
    expect(names.slice(0, 5)).toEqual(['打开 设置', '打开 IP 检测', '打开 终端', '打开 Tools', '打开 GitHub'])
    expect(wrapper.findAll('[role="separator"]')).toHaveLength(0)
    await wrapper.get('[aria-label="打开 IP 检测"]').trigger('click')
    expect(store.windows[0].appId).toBe('ip-check')
    await wrapper.get('[aria-label="打开 Tools"]').trigger('click')
    expect(openSpy).toHaveBeenCalledWith('https://tools.gmlhub.top', '_blank', 'noopener,noreferrer')
    expect(store.windows).toHaveLength(1)
  })

  it('allows scrolling an overflowing desktop Dock and clears overflow after resizing', async () => {
    vi.stubGlobal('innerWidth', 1024)
    const scrollWidth = vi.spyOn(HTMLElement.prototype, 'scrollWidth', 'get').mockReturnValue(1039)
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(981)
    wrapper = mount(Dock, { global: { plugins: [pinia] } })
    await wrapper.vm.$nextTick()
    const dock = wrapper.get('.dock')
    expect(dock.classes()).toContain('is-overflowing')
    expect(wrapper.get('.dock-scroll-fade-right').isVisible()).toBe(true)
    dock.element.scrollLeft = 58
    await dock.trigger('scroll')
    expect(wrapper.get('.dock-scroll-fade-right').attributes('style')).toContain('display: none')
    expect(wrapper.get('.dock-scroll-fade-left').isVisible()).toBe(true)
    scrollWidth.mockReturnValue(900)
    window.dispatchEvent(new Event('resize'))
    await flushPromises()
    expect(dock.classes()).not.toContain('is-overflowing')
    expect(wrapper.get('.dock-scroll-fade-left').attributes('style')).toContain('display: none')
  })

  it('magnifies neighboring slots once and restores their size on mouse leave', async () => {
    wrapper = mount(Dock, { global: { plugins: [pinia] } })
    vi.spyOn(wrapper.get('.dock').element, 'getBoundingClientRect').mockReturnValue({ left: 0, width: 356 })
    await wrapper.get('.dock').trigger('mousemove', { clientX: 141.5 })
    const items = wrapper.findAll('.dock-item')
    const width = index => parseFloat(items[index].element.style.width)
    expect(width(2)).toBeCloseTo(48 * 1.48)
    expect(width(1)).toBeGreaterThan(48)
    expect(width(1)).toBeLessThan(width(2))
    expect(items[2].find('.icon-glyph').attributes('style')).toBeUndefined()
    expect(wrapper.get('.dock').element.style.transform).toBe('')
    await wrapper.get('.dock').trigger('mouseleave')
    expect(width(2)).toBe(48)
    useDesktopStore().setIconSize('large')
    await wrapper.vm.$nextTick()
    expect(width(2)).toBe(56)
  })

  it.each(['touch', 'reduced motion'])('keeps magnification off for %s', async (mode) => {
    vi.stubGlobal('matchMedia', vi.fn(query => ({
      matches: mode === 'touch' ? false : query === '(hover: hover)' || query === '(prefers-reduced-motion: reduce)',
    })))
    wrapper = mount(Dock, { global: { plugins: [pinia] } })
    await wrapper.get('.dock').trigger('mousemove', { clientX: 100 })
    expect(wrapper.findAll('.dock-item').every(item => item.element.style.width === '48px')).toBe(true)
  })

  it('keeps the running indicator for a minimized app and restores it with one click', async () => {
    const store = useDesktopStore()
    store.openWindow('settings')
    store.minimizeWindow(store.windows[0].id)
    wrapper = mount(Dock, { global: { plugins: [pinia] } })
    const settings = wrapper.get('[aria-label="打开 设置"]')
    expect(settings.find('.dock-open-indicator').exists()).toBe(true)
    await settings.trigger('click')
    expect(store.windows).toHaveLength(1)
    expect(store.windows[0].minimized).toBe(false)
  })

  it('adds other running apps to the Dock and restores their minimized windows', async () => {
    const store = useDesktopStore()
    wrapper = mount(Dock, { global: { plugins: [pinia] } })
    store.openWindow('network-tools')
    const id = store.windows[0].id
    store.minimizeWindow(id)
    await wrapper.vm.$nextTick()
    const app = wrapper.get('[aria-label="打开 网络工具箱"]')
    expect(app.find('.dock-open-indicator').exists()).toBe(true)
    await app.trigger('click')
    expect(store.windows).toHaveLength(1)
    expect(store.windows[0].minimized).toBe(false)
    store.closeWindow(id)
    await wrapper.vm.$nextTick()
    expect(wrapper.find('[aria-label="打开 网络工具箱"]').exists()).toBe(false)
  })
})
