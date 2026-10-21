<template>
  <div class="ip-panel h-full overflow-auto text-hud-text">
    <div class="ip-shell">
      <header class="ip-heading">
        <span class="ip-symbol"><IconGlyph name="ip-check" :size="26" /></span>
        <div>
          <h2>看看你的网络出口</h2>
          <p>检测当前公网地址，或查询一个 IPv4 / IPv6。</p>
        </div>
      </header>

      <section class="ip-query" aria-label="IP 查询">
        <div class="ip-actions">
          <button type="button" class="ip-button primary" :disabled="isLoading" @click="runCheck(4)">检测当前 IPv4</button>
          <button type="button" class="ip-button" :disabled="isLoading" @click="runCheck(6)">检测当前 IPv6</button>
        </div>
        <form class="ip-form" @submit.prevent="runCheck()">
          <label for="ip-query-input">查询指定 IP</label>
          <div class="ip-input-row">
            <input
              id="ip-query-input"
              v-model="query"
              type="text"
              placeholder="例如 1.1.1.1 或 2606:4700:4700::1111"
              autocomplete="off"
              autocapitalize="off"
              spellcheck="false"
              maxlength="64"
              :disabled="isLoading"
              :aria-invalid="hasInputError"
              :aria-describedby="hasInputError ? 'ip-check-error' : 'ip-privacy'"
            />
            <button type="submit" class="ip-button" :disabled="isLoading || !query.trim()">查询</button>
          </div>
        </form>
        <p id="ip-privacy" class="ip-note">打开后自动检测当前公网 IPv4，向 ipify / Net.Coffee 发起查询；相关服务可见出口或查询 IP。结果不保存到本地。</p>
      </section>

      <p class="ip-status" role="status" aria-live="polite">{{ status }}</p>
      <div v-if="error" id="ip-check-error" class="ip-error" role="alert">
        <p>{{ error }}</p>
        <button v-if="!hasInputError" type="button" class="ip-button" :disabled="isLoading" @click="retry">重试</button>
      </div>

      <section v-if="result" class="ip-result" aria-label="查询结果" :aria-busy="isLoading">
        <div class="ip-result-head">
          <div class="ip-address-block">
            <p class="ip-note">{{ result.ip.includes(':') ? 'IPv6' : 'IPv4' }} · {{ resultKind }}</p>
            <p class="ip-address">{{ result.ip }}</p>
          </div>
          <button type="button" class="ip-button" @click="copyIp">复制 IP</button>
        </div>
        <dl class="ip-facts">
          <div><dt>归属地</dt><dd>{{ location }}</dd></div>
          <div><dt>运营商 / 组织</dt><dd>{{ result.isp || '未提供' }}</dd></div>
          <div><dt>自治系统</dt><dd>{{ result.asn || '未提供' }}</dd></div>
          <div><dt>网段</dt><dd>{{ result.cidr || '未提供' }}</dd></div>
        </dl>
        <div class="ip-reputation">
          <div>
            <h3>IP 信誉参考</h3>
            <p class="ip-note">数据源评分，分数越高代表信誉越好。</p>
          </div>
          <p class="ip-score">{{ result.score ?? '—' }}<span> / 100</span></p>
        </div>
        <dl class="ip-flags">
          <div v-for="flag in flagItems" :key="flag.key">
            <dt>{{ flag.label }}</dt>
            <dd :class="{ 'is-unknown': flag.value === null }">{{ flag.value === null ? '未知' : flag.value ? '是' : '否' }}</dd>
          </div>
        </dl>
        <p class="ip-note ip-disclaimer">{{ result.score == null ? '数据源未提供信誉分。' : '' }}归属地为估算；信誉与网络类型仅供参考，不代表精确位置、匿名性或任何平台账号的可用性。</p>
        <footer class="ip-result-footer">
          <span>来源：{{ result.source }} · {{ checkedTime }}</span>
          <button type="button" class="ip-button" @click="copyReport">复制结果</button>
        </footer>
      </section>
      <div v-else-if="!isLoading && !error" class="ip-empty">
        <IconGlyph name="ip-check" :size="42" />
        <p>从当前网络开始</p>
        <span>点击上方检测按钮查看出口地址。使用代理时，通常显示代理出口。</span>
      </div>
      <p class="ip-note ip-footnote">IPv6 检测失败也可能是网络、代理或数据源限制。功能参考 <a href="https://github.com/zhihui-hu/one-ip" target="_blank" rel="noopener noreferrer">one-ip</a>，查询由第三方数据源提供。</p>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { detectPublicIp, lookupIp, normalizeIp } from '../../services/ipCheck.js'
import IconGlyph from './IconGlyph.vue'

const query = ref('')
const result = ref(null)
const resultKind = ref('指定地址')
const isLoading = ref(false)
const hasInputError = ref(false)
const error = ref('')
const status = ref('尚未查询')
let controller
let lastVersion

const location = computed(() => [...new Set([result.value?.country, result.value?.region, result.value?.city].filter(Boolean))].join(' / ') || '未提供')
const checkedTime = computed(() => new Date(result.value.checkedAt).toLocaleTimeString('zh-CN', { hour12: false }))
const flagLabels = {
  residential: '住宅网络',
  datacenter: '数据中心',
  mobile: '移动网络',
  vpn: 'VPN 标记',
  proxy: '代理标记',
  tor: 'Tor 标记',
  abuser: '滥用标记',
  bogon: '保留地址',
}
const flagItems = computed(() => Object.entries(flagLabels).map(([key, label]) => ({
  key, label, value: result.value?.flags?.[key] ?? null,
})))

const runCheck = async (version, previousResult = null) => {
  if (isLoading.value) return
  hasInputError.value = false
  error.value = ''
  result.value = previousResult
  let ip
  if (!version) {
    try {
      ip = normalizeIp(previousResult?.ip || query.value)
    } catch (cause) {
      hasInputError.value = true
      error.value = cause.message
      status.value = '请检查输入的 IP 地址'
      return
    }
  }
  lastVersion = version
  controller = new AbortController()
  const { signal } = controller
  isLoading.value = true
  status.value = version ? `正在检测当前 IPv${version} 出口…` : '正在查询 IP 信息…'
  resultKind.value = version || previousResult ? '当前出口' : '指定地址'
  try {
    if (version) {
      ip = await detectPublicIp(version, signal)
      query.value = ip
      result.value = { ip, source: 'ipify', checkedAt: new Date().toISOString() }
      status.value = '已获取出口地址，正在查询归属与信誉…'
    }
    result.value = await lookupIp(ip, signal)
    status.value = '查询完成'
  } catch (cause) {
    if (signal.aborted) return
    error.value = result.value ? `已获取出口 IP，详细信息查询失败。${cause.message}` : cause.message
    if (version === 6 && !result.value) error.value += ' 当前网络或代理可能无法访问 IPv6 检测服务。'
    status.value = result.value ? '已获取 IP，详细信息暂不可用' : '查询未完成'
  } finally {
    if (!signal.aborted) isLoading.value = false
  }
}

const retry = () => runCheck(result.value ? undefined : lastVersion, result.value)

const copyText = async (text) => {
  try {
    await navigator.clipboard.writeText(text)
    status.value = '已复制到剪贴板'
  } catch {
    status.value = '复制失败，请选中文本手动复制'
  }
}
const copyIp = () => copyText(result.value.ip)
const copyReport = () => copyText([
  `IP：${result.value.ip}`,
  `归属地：${location.value}`,
  `运营商 / 组织：${result.value.isp || '未提供'}`,
  `ASN：${result.value.asn || '未提供'}`,
  `网段：${result.value.cidr || '未提供'}`,
  `信誉分：${result.value.score == null ? '未提供' : `${result.value.score} / 100（越高越好）`}`,
  ...flagItems.value.map(flag => `${flag.label}：${flag.value === null ? '未知' : flag.value ? '是' : '否'}`),
  `来源：${result.value.source}；查询时间：${result.value.checkedAt}`,
  '第三方估算，仅供参考，不代表精确位置、匿名性或平台账号可用性。',
].join('\n'))

onMounted(() => runCheck(4))
onUnmounted(() => controller?.abort())
</script>

<style scoped>
.ip-panel {
  background: var(--hud-surface);
  --hud-muted: #667085;
  --hud-primary: #416bb6;
  --hud-primary-faint: rgba(91, 131, 206, 0.12);
  --hud-primary-border: rgba(91, 131, 206, 0.34);
  --hud-red: #b42336;
}
.ip-shell { max-width: 900px; margin: 0 auto; padding: 24px; }
.ip-heading { display: flex; align-items: center; gap: 14px; margin-bottom: 22px; }
.ip-symbol { padding: 12px; border-radius: var(--radius-card); background: var(--hud-primary-faint); color: var(--hud-primary); }
h2 { font-size: 21px; font-weight: 600; }
.ip-heading p, .ip-note, .ip-footnote { color: var(--hud-muted); font-size: 12px; line-height: 1.7; }
.ip-query, .ip-result { border: 1px solid var(--hud-line); border-radius: var(--radius-card); background: var(--hud-card); padding: 20px; }
.ip-actions { display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 20px; }
.ip-button { min-height: 40px; padding: 8px 14px; border: 1px solid var(--hud-line-strong); border-radius: var(--radius-inner); font-size: 13px; color: var(--hud-text); background: var(--hud-card); }
.ip-button:hover:not(:disabled) { background: var(--hud-card-hover); border-color: var(--hud-primary-border); }
.ip-button.primary { background: var(--hud-primary-faint); border-color: var(--hud-primary-border); color: var(--hud-primary); }
.ip-button:disabled { opacity: .5; cursor: not-allowed; }
.ip-form label { display: block; font-size: 13px; margin-bottom: 8px; }
.ip-input-row { display: flex; gap: 10px; margin-bottom: 12px; }
.ip-input-row input { flex: 1; min-width: 0; border: 1px solid var(--hud-line-strong); border-radius: var(--radius-inner); background: var(--hud-void); padding: 10px 12px; color: var(--hud-text); font-size: 13px; }
.ip-input-row input:focus-visible { outline: 2px solid var(--hud-primary); outline-offset: 2px; }
.ip-input-row input[aria-invalid='true'] { border-color: var(--hud-red); }
.ip-status { font-size: 13px; color: var(--hud-primary); padding: 14px 0; }
.ip-error { display: flex; align-items: center; justify-content: space-between; gap: 14px; padding: 14px; margin-bottom: 16px; border: 1px solid var(--hud-red); border-radius: var(--radius-inner); color: var(--hud-red); font-size: 13px; line-height: 1.7; }
.ip-error .ip-button { flex-shrink: 0; }
.ip-result-head { display: flex; gap: 12px; justify-content: space-between; align-items: center; }
.ip-address-block { min-width: 0; }
.ip-address { font: 500 clamp(18px, 3.5vw, 28px)/1.6 'SFMono-Regular', Consolas, monospace; overflow-wrap: anywhere; user-select: text; }
.ip-result-head .ip-button { flex-shrink: 0; }
.ip-facts { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; border-top: 1px solid var(--hud-line); margin-top: 18px; padding: 18px 0; }
dt { color: var(--hud-muted); font-size: 12px; }
dd { margin-top: 5px; font-size: 14px; overflow-wrap: anywhere; }
.ip-reputation { display: flex; justify-content: space-between; align-items: center; gap: 14px; border-top: 1px solid var(--hud-line); padding-top: 18px; }
h3 { font-size: 14px; font-weight: 600; }
.ip-score { font-size: 28px; font-variant-numeric: tabular-nums; white-space: nowrap; }
.ip-score span { font-size: 12px; color: var(--hud-muted); }
.ip-flags { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; padding: 18px 0; }
.ip-flags dd { font-size: 13px; }
.is-unknown { color: var(--hud-muted); }
.ip-disclaimer { padding-top: 4px; }
.ip-result-footer { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; margin-top: 18px; padding-top: 16px; border-top: 1px solid var(--hud-line); font-size: 12px; color: var(--hud-muted); }
.ip-empty { display: flex; flex-direction: column; gap: 10px; align-items: center; text-align: center; padding: 36px 18px; color: var(--hud-muted); }
.ip-empty p { color: var(--hud-text); font-size: 15px; }
.ip-empty span { font-size: 13px; line-height: 1.8; }
.ip-footnote { margin-top: 18px; }
.ip-footnote a { color: var(--hud-primary); text-decoration: underline; }
@media (max-width: 500px) {
  .ip-shell { padding: 16px; }
  .ip-query, .ip-result { padding: 14px; }
  h2 { font-size: 18px; }
  .ip-symbol { display: none; }
  .ip-flags { grid-template-columns: repeat(2, 1fr); }
}
</style>
