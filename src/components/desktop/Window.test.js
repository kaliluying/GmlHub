import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { useDesktopStore } from '../../stores/desktop.js'
import Window from './Window.vue'

vi.mock('gsap', () => ({ gsap: { fromTo: vi.fn(() => ({ kill: vi.fn() })) } }))
vi.mock('../../apps/registry.js', () => ({
  getAppPlugin: () => ({ component: { template: '<header class="settings-toolbar">设置</header>' } }),
}))

let wrapper
let store
beforeEach(() => {
  localStorage.clear()
  const pinia = createPinia()
  setActivePinia(pinia)
  vi.stubGlobal('innerWidth', 1440)
  vi.stubGlobal('innerHeight', 1000)
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false })))
  vi.stubGlobal('requestAnimationFrame', vi.fn(callback => { callback(); return 1 }))
  store = useDesktopStore()
  store.openWindow('settings')
  wrapper = mount(Window, { props: { window: store.windows[0] }, global: { plugins: [pinia] } })
})
afterEach(() => {
  wrapper.unmount()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('macOS window chrome', () => {
  it('keeps close, minimize and maximize controls in native order and preserves their state transitions', async () => {
    expect(wrapper.findAll('.title-bar button').map(button => button.attributes('aria-label')))
      .toEqual(['关闭窗口', '最小化窗口', '最大化窗口'])
    await wrapper.get('[aria-label="最大化窗口"]').trigger('click')
    expect(store.windows[0].maximized).toBe(true)
    await wrapper.get('[aria-label="最大化窗口"]').trigger('click')
    expect(store.windows[0].maximized).toBe(false)
    await wrapper.get('[aria-label="最小化窗口"]').trigger('click')
    expect(store.windows[0].minimized).toBe(true)
    store.openWindow('settings')
    await wrapper.vm.$nextTick()
    expect(store.windows[0].minimized).toBe(false)
    await wrapper.get('[aria-label="关闭窗口"]').trigger('click')
    expect(store.windows).toHaveLength(0)
  })

  it('allows dragging by the integrated settings toolbar and persists the final position', async () => {
    const initial = { x: store.windows[0].x, y: store.windows[0].y }
    const persist = vi.spyOn(store, 'persistWindowState')
    wrapper.get('.settings-toolbar').element.dispatchEvent(Object.assign(new Event('pointerdown', { bubbles: true }), { pointerId: 1, clientX: 400, clientY: 200 }))
    document.dispatchEvent(Object.assign(new Event('pointermove'), { pointerId: 1, clientX: 420, clientY: 220 }))
    document.dispatchEvent(new Event('pointerup'))
    expect(store.windows[0].x).toBe(initial.x + 20)
    expect(store.windows[0].y).toBe(initial.y + 20)
    expect(persist).toHaveBeenCalledOnce()
  })
})
