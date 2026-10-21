export const IP_LOOKUP_SOURCE = 'Net.Coffee'
export const IP_REQUEST_TIMEOUT_MS = 10000

export const normalizeIp = (value) => {
  if (typeof value !== 'string') throw new Error('请输入有效的 IPv4 或 IPv6 地址')
  const ip = value.trim()
  if (/^(?:\d{1,3}\.){3}\d{1,3}$/.test(ip)) {
    if (ip.split('.').every(part => Number(part) <= 255 && String(Number(part)) === part)) return ip
  } else if (ip.includes(':') && /^[\da-f:.]+$/i.test(ip)) {
    try {
      return new URL(`https://[${ip}]/`).hostname.slice(1, -1)
    } catch {
      // URL 的 IPv6 解析器负责压缩与校验，拒绝带端口、路径或作用域的输入。
    }
  }
  throw new Error('请输入有效的 IPv4 或 IPv6 地址，不包含网址、端口或网段后缀')
}

const requestJson = async (url, signal) => {
  const controller = new AbortController()
  const cancel = () => controller.abort()
  signal?.throwIfAborted()
  signal?.addEventListener('abort', cancel, { once: true })
  const timeout = setTimeout(cancel, IP_REQUEST_TIMEOUT_MS)
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      credentials: 'omit',
      referrerPolicy: 'no-referrer',
      cache: 'no-store',
    })
    if (response.status === 429) throw new Error('查询次数过多，数据源已限流，请稍后重试')
    if (!response.ok) throw new Error(`数据源暂不可用（HTTP ${response.status}），请稍后重试`)
    return await response.json()
  } catch (error) {
    if (signal?.aborted) throw error
    if (controller.signal.aborted) throw new Error('查询超时，请检查网络后重试')
    if (error instanceof TypeError) throw new Error('无法连接数据源，请检查网络或跨域限制后重试')
    if (error instanceof SyntaxError) throw new Error('数据源返回了无法读取的结果，请稍后重试')
    throw error
  } finally {
    clearTimeout(timeout)
    signal?.removeEventListener('abort', cancel)
  }
}

export const detectPublicIp = async (version, signal) => {
  if (![4, 6].includes(version)) throw new Error('请选择 IPv4 或 IPv6')
  const host = version === 4 ? 'api.ipify.org' : 'api6.ipify.org'
  const data = await requestJson(`https://${host}/?format=json`, signal)
  const ip = normalizeIp(data?.ip)
  if (ip.includes(':') !== (version === 6)) throw new Error('数据源返回的 IP 版本不匹配，请重试')
  return ip
}

export const lookupIp = async (value, signal) => {
  const ip = normalizeIp(value)
  const data = await requestJson(`https://ip.net.coffee/api/ip/lookup/${encodeURIComponent(ip)}`, signal)
  if (!data || data.error) throw new Error('该地址暂无查询结果，请确认地址或稍后重试')
  let returnedIp
  try {
    returnedIp = normalizeIp(data.ip)
  } catch {
    throw new Error('数据源未返回有效 IP，请稍后重试')
  }
  if (returnedIp !== ip) throw new Error('数据源返回的 IP 与查询地址不一致，请重试')
  const text = value => typeof value === 'string' && value.trim() ? value.trim() : null
  const score = data.trust_score
  return {
    ip,
    country: text(data.country),
    region: text(data.region),
    city: text(data.city),
    isp: text(data.isp) || text(data.asOrganization) || text(data.company_name),
    asn: Number.isInteger(data.asn) && data.asn > 0 ? `AS${data.asn}` : null,
    cidr: text(data.cidr),
    score: typeof score === 'number' && Number.isFinite(score) && score >= 0 && score <= 100 ? score : null,
    flags: Object.fromEntries([
      ['residential', data.isResidential],
      ['datacenter', data.is_datacenter],
      ['mobile', data.is_mobile],
      ['vpn', data.is_vpn],
      ['proxy', data.is_proxy],
      ['tor', data.is_tor],
      ['abuser', data.is_abuser],
      ['bogon', data.is_bogon],
    ].map(([key, value]) => [key, typeof value === 'boolean' ? value : null])),
    source: IP_LOOKUP_SOURCE,
    checkedAt: new Date().toISOString(),
  }
}
