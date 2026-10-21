import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { detectPublicIp, IP_REQUEST_TIMEOUT_MS, lookupIp, normalizeIp } from './ipCheck.js'

let fetchMock
const respond = (data, status = 200) => ({ ok: status === 200, status, json: async () => data })

beforeEach(() => {
  fetchMock = vi.fn()
  vi.stubGlobal('fetch', fetchMock)
})
afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe('IP input', () => {
  it.each([
    [' 1.1.1.1 ', '1.1.1.1'],
    ['2606:4700:4700:0:0:0:0:1111', '2606:4700:4700::1111'],
    ['2001:DB8::A', '2001:db8::a'],
    ['::ffff:192.0.2.1', '::ffff:c000:201'],
  ])('normalizes %s', (input, expected) => expect(normalizeIp(input)).toBe(expected))

  it.each(['', null, '256.1.1.1', '01.1.1.1', '1.1.1', 'https://1.1.1.1', '1.1.1.1/24', '1.1.1.1:80', '[::1]', '2001:::1', 'fe80::1%en0', 'example.com'])('rejects %s before sending any request', async (input) => {
    await expect(lookupIp(input)).rejects.toThrow('IPv4')
    expect(fetchMock).not.toHaveBeenCalled()
  })
})

describe('IP data source', () => {
  it('gets IPv4 and IPv6 from their respective browser endpoints', async () => {
    fetchMock.mockResolvedValueOnce(respond({ ip: '1.1.1.1' }))
      .mockResolvedValueOnce(respond({ ip: '2606:4700:4700::1111' }))
    expect(await detectPublicIp(4)).toBe('1.1.1.1')
    expect(await detectPublicIp(6)).toBe('2606:4700:4700::1111')
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual(['https://api.ipify.org/?format=json', 'https://api6.ipify.org/?format=json'])
  })

  it('does not accept the wrong IP family', async () => {
    fetchMock.mockResolvedValue(respond({ ip: '1.1.1.1' }))
    await expect(detectPublicIp(6)).rejects.toThrow('版本不匹配')
  })

  it('validates provider identity and keeps unknown scores and flags unknown', async () => {
    fetchMock.mockResolvedValue(respond({ ip: '1.1.1.1', country: 'Australia', asn: 13335, trust_score: '90', is_vpn: 'false', is_proxy: false, isResidential: true }))
    const data = await lookupIp('1.1.1.1')
    expect(data).toMatchObject({ ip: '1.1.1.1', asn: 'AS13335', score: null, flags: { vpn: null, proxy: false, residential: true, tor: null } })
    expect(fetchMock).toHaveBeenCalledWith('https://ip.net.coffee/api/ip/lookup/1.1.1.1', expect.objectContaining({ credentials: 'omit', referrerPolicy: 'no-referrer', cache: 'no-store' }))
  })

  it.each([null, -1, 101, Infinity, '75'])('does not fabricate a score from %s', async (score) => {
    fetchMock.mockResolvedValue(respond({ ip: '1.1.1.1', trust_score: score }))
    expect((await lookupIp('1.1.1.1')).score).toBeNull()
  })

  it.each([0, 41, 100])('keeps valid score %s including zero', async (score) => {
    fetchMock.mockResolvedValue(respond({ ip: '1.1.1.1', trust_score: score }))
    expect((await lookupIp('1.1.1.1')).score).toBe(score)
  })

  it('compares canonical IPv6 addresses and encodes them in the request path', async () => {
    fetchMock.mockResolvedValue(respond({ ip: '2606:4700:4700:0:0:0:0:1111' }))
    expect((await lookupIp('2606:4700:4700::1111')).ip).toBe('2606:4700:4700::1111')
    expect(fetchMock.mock.calls[0][0]).toContain('2606%3A4700%3A4700%3A%3A1111')
  })

  it.each([
    [{ ip: '8.8.8.8' }, '不一致'],
    [{ country: 'Australia' }, '未返回有效 IP'],
    [{ error: 'bad query' }, '暂无查询结果'],
  ])('rejects invalid provider results', async (data, message) => {
    fetchMock.mockResolvedValue(respond(data))
    await expect(lookupIp('1.1.1.1')).rejects.toThrow(message)
  })

  it.each([[429, '限流'], [503, 'HTTP 503']])('reports HTTP %s without treating it as a result', async (code, message) => {
    fetchMock.mockResolvedValue(respond({}, code))
    await expect(lookupIp('1.1.1.1')).rejects.toThrow(message)
  })

  it('handles invalid JSON and network failures', async () => {
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => { throw new SyntaxError('json') } })
    await expect(lookupIp('1.1.1.1')).rejects.toThrow('无法读取')
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'))
    await expect(lookupIp('1.1.1.1')).rejects.toThrow('检查网络')
  })

  it('times out and aborts the pending request', async () => {
    vi.useFakeTimers()
    fetchMock.mockImplementation((_url, { signal }) => new Promise((_resolve, reject) => {
      signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')))
    }))
    const request = expect(lookupIp('1.1.1.1')).rejects.toThrow('超时')
    await vi.advanceTimersByTimeAsync(IP_REQUEST_TIMEOUT_MS)
    await request
    expect(vi.getTimerCount()).toBe(0)
  })

  it('cancels on close and cleans up the timeout', async () => {
    vi.useFakeTimers()
    const controller = new AbortController()
    fetchMock.mockImplementation((_url, { signal }) => new Promise((_resolve, reject) => {
      signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')))
    }))
    const request = expect(lookupIp('1.1.1.1', controller.signal)).rejects.toThrow('Aborted')
    controller.abort()
    await request
    expect(vi.getTimerCount()).toBe(0)
    await expect(lookupIp('1.1.1.1', controller.signal)).rejects.toThrow()
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})
