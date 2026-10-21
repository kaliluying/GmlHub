<template>
  <section class="network-tools-panel" aria-label="网络工具箱">
    <div class="network-toolbar">
      <span>one-ip 网络诊断</span>
      <div>
        <a href="/one-ip/" target="_blank" rel="noopener noreferrer">独立打开</a>
        <button type="button" @click="loadModule">重新载入</button>
      </div>
    </div>
    <div v-if="isLoading" class="network-message" role="status">正在连接网络工具箱…</div>
    <div v-else-if="error" class="network-message" role="alert">
      <p>{{ error }}</p>
      <button type="button" @click="loadModule">重试连接</button>
    </div>
    <iframe
      v-else
      :key="frameKey"
      src="/one-ip/"
      title="one-ip 网络工具箱"
      referrerpolicy="no-referrer"
    />
  </section>
</template>

<script setup>
import { onMounted, onUnmounted, ref } from 'vue'

const isLoading = ref(true)
const error = ref('')
const frameKey = ref(0)
let controller

async function loadModule() {
  controller?.abort()
  const pending = new AbortController()
  controller = pending
  const timeout = setTimeout(() => pending.abort(), 15000)
  isLoading.value = true
  error.value = ''
  try {
    const response = await fetch('/one-ip/api/browser/challenges', {
      signal: pending.signal,
      cache: 'no-store',
    })
    if (!response.ok || !response.headers.get('content-type')?.includes('application/json')) {
      throw new Error('backend unavailable')
    }
    const config = await response.json()
    if (!Array.isArray(config)) throw new Error('invalid backend response')
    if (controller !== pending) return
    frameKey.value += 1
  } catch {
    if (controller === pending) {
      error.value = '网络工具箱暂时无法连接，请稍后重试。若持续失败，请联系站点维护者检查服务。'
    }
  } finally {
    clearTimeout(timeout)
    if (controller === pending) isLoading.value = false
  }
}

onMounted(loadModule)
onUnmounted(() => {
  controller?.abort()
  controller = null
})
</script>

<style scoped>
.network-tools-panel { display: flex; flex-direction: column; height: 100%; min-height: 0; background: #fafafa; color: #182235; }
.network-toolbar { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 0.5rem; padding: 0.55rem 0.85rem; border-bottom: 1px solid #dbe3ed; font-size: 0.75rem; }
.network-toolbar > div { display: flex; gap: 0.85rem; }
.network-toolbar a, .network-toolbar button, .network-message button { color: #176b8b; text-decoration: underline; text-underline-offset: 3px; }
button:focus-visible, a:focus-visible { outline: 2px solid #176b8b; outline-offset: 3px; }
iframe { width: 100%; flex: 1; min-height: 0; border: 0; background: #fafafa; }
.network-message { display: grid; align-content: center; justify-items: center; gap: 1rem; flex: 1; padding: 1.5rem; text-align: center; }
</style>
