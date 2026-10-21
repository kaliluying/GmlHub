import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import IpCheckPanel from './IpCheckPanel.vue'

let wrapper
let fetchMock
const response = data => ({ ok: true, status: 200, json: async () => data })
const button = text => wrapper.findAll('button').find(node => node.text() === text)
const submitIp = async (ip) => {
  await wrapper.get('input').setValue(ip)
  await wrapper.get('form').trigger('submit')
  await flushPromises()
}

beforeEach(() => {
  fetchMock = vi.fn()
  vi.stubGlobal('fetch', fetchMock)
})
afterEach(() => {
  wrapper?.unmount()
  vi.unstubAllGlobals()
})

describe('IP detection panel', () => {
  it('automatically detects the current IPv4 on opening and queries its details', async () => {
    fetchMock.mockResolvedValueOnce(response({ ip: '1.1.1.1' }))
      .mockResolvedValueOnce(response({ ip: '1.1.1.1', country: 'Australia', asn: 13335 }))
    wrapper = mount(IpCheckPanel)
    await wrapper.vm.$nextTick()
    expect(wrapper.get('[role="status"]').text()).toContain('正在检测当前 IPv4')
    expect(button('检测当前 IPv4').attributes('disabled')).toBeDefined()
    await flushPromises()
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(fetchMock.mock.calls[0][0]).toBe('https://api.ipify.org/?format=json')
    expect(fetchMock.mock.calls[1][0]).toContain('/lookup/1.1.1.1')
    expect(wrapper.get('.ip-address').text()).toBe('1.1.1.1')
    expect(wrapper.text()).toContain('当前出口')
    expect(wrapper.text()).toContain('AS13335')
    expect(wrapper.get('[role="status"]').text()).toBe('查询完成')
  })

  it('still validates manual input locally after the automatic query', async () => {
    fetchMock.mockResolvedValue(response({ ip: '1.1.1.1' }))
    wrapper = mount(IpCheckPanel)
    await flushPromises()
    fetchMock.mockClear()
    expect(wrapper.text()).toContain('结果不保存到本地')
    await submitIp('example.com')
    expect(wrapper.get('[role="alert"]').text()).toContain('有效的 IPv4 或 IPv6')
    expect(wrapper.get('input').attributes('aria-invalid')).toBe('true')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('queries an address, labels unknown fields and copies IP or report', async () => {
    const writeText = vi.fn().mockResolvedValue()
    vi.stubGlobal('navigator', { clipboard: { writeText } })
    fetchMock.mockResolvedValue(response({ ip: '1.1.1.1', country: 'Australia', trust_score: 0, is_vpn: false }))
    wrapper = mount(IpCheckPanel)
    await flushPromises()
    await submitIp('1.1.1.1')
    expect(wrapper.get('[aria-label="查询结果"]').text()).toContain('1.1.1.1')
    expect(wrapper.get('.ip-score').text()).toContain('0 / 100')
    expect(wrapper.text()).toContain('未知')
    await button('复制 IP').trigger('click')
    await flushPromises()
    expect(writeText).toHaveBeenLastCalledWith('1.1.1.1')
    await button('复制结果').trigger('click')
    expect(writeText.mock.calls.at(-1)[0]).toContain('信誉分：0 / 100')
    expect(writeText.mock.calls.at(-1)[0]).toContain('Tor 标记：未知')
    expect(wrapper.get('[role="status"]').text()).toContain('已复制')
  })

  it('retains the detected IP if details fail, then retries details only', async () => {
    fetchMock.mockResolvedValueOnce(response({ ip: '1.1.1.1' }))
      .mockRejectedValueOnce(new TypeError('offline'))
      .mockRejectedValueOnce(new TypeError('still offline'))
      .mockResolvedValueOnce(response({ ip: '1.1.1.1', asn: 13335 }))
    wrapper = mount(IpCheckPanel)
    await flushPromises()
    expect(wrapper.get('.ip-address').text()).toBe('1.1.1.1')
    expect(wrapper.get('[role="alert"]').text()).toContain('已获取出口 IP')
    expect(wrapper.get('.ip-score').text()).toContain('—')
    await wrapper.get('input').setValue('8.8.8.8')
    await button('重试').trigger('click')
    await flushPromises()
    expect(wrapper.get('.ip-address').text()).toBe('1.1.1.1')
    expect(wrapper.text()).toContain('当前出口')
    expect(wrapper.get('[role="alert"]').text()).toContain('详细信息查询失败')
    await button('重试').trigger('click')
    await flushPromises()
    expect(fetchMock).toHaveBeenCalledTimes(4)
    expect(fetchMock.mock.calls[2][0]).toContain('/lookup/1.1.1.1')
    expect(fetchMock.mock.calls[3][0]).toContain('/lookup/1.1.1.1')
    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
    expect(wrapper.text()).toContain('AS13335')
    expect(wrapper.text()).toContain('当前出口')
  })

  it('explains IPv6 connection failure and offers a retry', async () => {
    fetchMock.mockRejectedValue(new TypeError('offline'))
    wrapper = mount(IpCheckPanel)
    await flushPromises()
    await button('检测当前 IPv6').trigger('click')
    await flushPromises()
    expect(wrapper.get('[role="alert"]').text()).toContain('网络或代理可能无法访问 IPv6')
    expect(button('重试').exists()).toBe(true)
  })

  it('prevents duplicate requests while loading, aborts on close and does not store results', async () => {
    const storageSpy = vi.spyOn(Storage.prototype, 'setItem')
    fetchMock.mockImplementation((_url, { signal }) => new Promise((_resolve, reject) => {
      signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')))
    }))
    wrapper = mount(IpCheckPanel)
    expect(button('查询').attributes('disabled')).toBeDefined()
    await wrapper.get('form').trigger('submit')
    expect(fetchMock).toHaveBeenCalledTimes(1)
    wrapper.unmount()
    wrapper = null
    await flushPromises()
    expect(fetchMock.mock.calls[0][1].signal.aborted).toBe(true)
    expect(storageSpy).not.toHaveBeenCalled()
    storageSpy.mockRestore()
  })

  it('shows a manual copy fallback when clipboard permission is unavailable', async () => {
    vi.stubGlobal('navigator', {})
    fetchMock.mockResolvedValue(response({ ip: '1.1.1.1' }))
    wrapper = mount(IpCheckPanel)
    await flushPromises()
    await button('复制 IP').trigger('click')
    await flushPromises()
    expect(wrapper.get('[role="status"]').text()).toContain('手动复制')
  })

  it('retries the current IPv4 when automatic detection fails', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('offline'))
      .mockResolvedValueOnce(response({ ip: '1.1.1.1' }))
      .mockResolvedValueOnce(response({ ip: '1.1.1.1' }))
    wrapper = mount(IpCheckPanel)
    await flushPromises()
    expect(wrapper.get('[role="alert"]').text()).toContain('无法连接数据源')
    await button('重试').trigger('click')
    await flushPromises()
    expect(fetchMock.mock.calls[1][0]).toBe('https://api.ipify.org/?format=json')
    expect(wrapper.get('[role="status"]').text()).toBe('查询完成')
  })
})
