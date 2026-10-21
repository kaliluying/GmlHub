import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import Panel from './NetworkToolsPanel.vue'

afterEach(() => vi.unstubAllGlobals())

describe('network tools panel', () => {
  it('opens the local module after checking the actual backend, and remounts on reload', async () => {
    vi.stubGlobal('fetch', vi.fn().mockImplementation(async () => new Response('[]', { headers: { 'Content-Type': 'application/json' } })))
    const wrapper = mount(Panel)
    expect(wrapper.get('[role="status"]').text()).toContain('正在连接')
    await flushPromises()
    const original = wrapper.get('iframe').element
    expect(wrapper.get('iframe').attributes('src')).toBe('/one-ip/')
    expect(wrapper.get('a').attributes('href')).toBe('/one-ip/')
    await wrapper.get('button').trigger('click')
    await flushPromises()
    expect(wrapper.get('iframe').element).not.toBe(original)
    wrapper.unmount()
  })

  it('rejects a static SPA fallback as a backend response and lets the user retry', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(new Response('<html/>', { headers: { 'Content-Type': 'text/html' } }))
      .mockResolvedValueOnce(new Response('[]', { headers: { 'Content-Type': 'application/json' } })))
    const wrapper = mount(Panel)
    await flushPromises()
    expect(wrapper.get('[role="alert"]').text()).toContain('暂时无法连接')
    expect(wrapper.find('iframe').exists()).toBe(false)
    await wrapper.get('[role="alert"] button').trigger('click')
    await flushPromises()
    expect(wrapper.find('iframe').exists()).toBe(true)
    wrapper.unmount()
  })

  it('aborts the pending request when the window closes', () => {
    let signal
    vi.stubGlobal('fetch', vi.fn((url, options) => { signal = options.signal; return new Promise(() => {}) }))
    const wrapper = mount(Panel)
    wrapper.unmount()
    expect(signal.aborted).toBe(true)
  })
})
