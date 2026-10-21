import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { useDesktopStore } from '../../stores/desktop.js'
import Dock from './Dock.vue'

let wrapper
let pinia

beforeEach(() => {
  pinia = createPinia()
  setActivePinia(pinia)
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: true })))
  vi.stubGlobal('requestAnimationFrame', vi.fn(callback => { callback(); return 1 }))
})

afterEach(() => {
  wrapper?.unmount()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('grouped Dock', () => {
  it('separates groups and keeps tools internal and links external', async () => {
    const store = useDesktopStore()
    const openSpy = vi.spyOn(window, 'open').mockReturnValue(null)
    wrapper = mount(Dock, { global: { plugins: [pinia] } })
    const names = wrapper.findAll('[role="button"]').map(button => button.attributes('aria-label'))
    expect(names.slice(0, 5)).toEqual(['打开 IP 检测', '打开 网络工具箱', '打开 终端', '打开 设置', '打开 Tools'])
    expect(wrapper.findAll('[role="separator"]').map(divider => divider.attributes('aria-label'))).toEqual(['外部链接', '个人信息'])
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
    await wrapper.vm.$nextTick()
    expect(dock.classes()).not.toContain('is-overflowing')
    expect(wrapper.get('.dock-scroll-fade-left').attributes('style')).toContain('display: none')
  })
})
