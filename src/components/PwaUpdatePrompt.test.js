import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import PwaUpdatePrompt from './PwaUpdatePrompt.vue'

let registration
let serviceWorker
let wrapper

function createWorker(state = 'installed') {
  return Object.assign(new EventTarget(), { state, postMessage: vi.fn() })
}

beforeEach(() => {
  vi.stubEnv('PROD', true)
  registration = Object.assign(new EventTarget(), {
    waiting: null,
    installing: null,
    update: vi.fn().mockResolvedValue(),
  })
  serviceWorker = Object.assign(new EventTarget(), {
    controller: { postMessage: vi.fn() },
    register: vi.fn().mockResolvedValue(registration),
  })
  vi.stubGlobal('navigator', { serviceWorker, onLine: true })
})

afterEach(() => {
  wrapper?.unmount()
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
  vi.useRealTimers()
})

describe('PWA update prompt', () => {
  it('offers an already waiting update and activates it only after a click', async () => {
    registration.waiting = createWorker()
    wrapper = mount(PwaUpdatePrompt)
    await flushPromises()
    expect(serviceWorker.register).toHaveBeenCalledWith('/sw.js', { updateViaCache: 'none' })
    expect(wrapper.text()).toContain('新版本已就绪')
    expect(registration.waiting.postMessage).not.toHaveBeenCalled()
    await wrapper.get('button').trigger('click')
    expect(registration.waiting.postMessage).toHaveBeenCalledExactlyOnceWith({ type: 'SKIP_WAITING' })
    expect(wrapper.get('button').attributes('disabled')).toBeDefined()
  })

  it('allows postponing an update without activating it', async () => {
    registration.waiting = createWorker()
    wrapper = mount(PwaUpdatePrompt)
    await flushPromises()
    await wrapper.findAll('button')[1].trigger('click')
    expect(wrapper.find('aside').exists()).toBe(false)
    expect(registration.waiting.postMessage).not.toHaveBeenCalled()
  })

  it('detects an update installed after the page opened', async () => {
    wrapper = mount(PwaUpdatePrompt)
    await flushPromises()
    expect(wrapper.find('aside').exists()).toBe(false)
    registration.installing = createWorker('installing')
    registration.dispatchEvent(new Event('updatefound'))
    registration.waiting = registration.installing
    registration.waiting.state = 'installed'
    registration.waiting.dispatchEvent(new Event('statechange'))
    await flushPromises()
    expect(wrapper.text()).toContain('桌面设置会保留')
  })

  it('does not show an update prompt on the first installation', async () => {
    serviceWorker.controller = null
    registration.waiting = createWorker()
    wrapper = mount(PwaUpdatePrompt)
    await flushPromises()
    expect(wrapper.find('aside').exists()).toBe(false)
  })

  it('shows a retryable error if update activation cannot be requested', async () => {
    registration.waiting = createWorker()
    registration.waiting.postMessage.mockImplementation(() => { throw new Error('worker gone') })
    wrapper = mount(PwaUpdatePrompt)
    await flushPromises()
    await wrapper.get('button').trigger('click')
    expect(wrapper.get('[role="status"]').text()).toBe('更新未能启用，请重试')
    expect(wrapper.get('button').attributes('disabled')).toBeUndefined()
  })

  it('checks again when connectivity returns and cleans up listeners', async () => {
    wrapper = mount(PwaUpdatePrompt)
    await flushPromises()
    window.dispatchEvent(new Event('online'))
    expect(registration.update).toHaveBeenCalledOnce()
    wrapper.unmount()
    window.dispatchEvent(new Event('online'))
    expect(registration.update).toHaveBeenCalledOnce()
    wrapper = null
  })

  it('restores the retry button if activation never finishes', async () => {
    registration.waiting = createWorker()
    wrapper = mount(PwaUpdatePrompt)
    await flushPromises()
    vi.useFakeTimers()
    await wrapper.get('button').trigger('click')
    await vi.advanceTimersByTimeAsync(10000)
    expect(wrapper.get('[role="status"]').text()).toBe('更新未完成，请重试')
    expect(wrapper.get('button').attributes('disabled')).toBeUndefined()
  })
})
