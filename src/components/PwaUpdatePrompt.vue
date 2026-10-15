<template>
  <aside
    v-if="waitingWorker && !dismissed"
    aria-label="网站更新"
    class="fixed bottom-24 left-4 right-4 z-[230] mx-auto max-w-md rounded-2xl border border-hud-line bg-hud-surface p-4 text-hud-text shadow-hud-card"
  >
    <p role="status" class="font-semibold">{{ error || '新版本已就绪' }}</p>
    <p class="mt-1 text-sm text-hud-muted">刷新后使用新版，桌面设置会保留。</p>
    <div class="mt-3 flex flex-wrap gap-3">
      <button
        type="button"
        class="rounded-lg bg-hud-text px-3 py-2 text-sm text-hud-surface disabled:opacity-60"
        :disabled="refreshing"
        @click="applyUpdate"
      >{{ refreshing ? '正在更新…' : '刷新使用新版' }}</button>
      <button type="button" class="rounded-lg px-3 py-2 text-sm" :disabled="refreshing" @click="dismissed = true">
        稍后再说
      </button>
    </div>
  </aside>
</template>

<script setup>
import { onMounted, onUnmounted, ref, shallowRef } from 'vue'

const waitingWorker = shallowRef(null)
const dismissed = ref(false)
const refreshing = ref(false)
const error = ref('')
let registration
let installingWorker
let disposed = false
let refreshTimeout

function showUpdate() {
  if (registration.waiting && navigator.serviceWorker.controller) {
    waitingWorker.value = registration.waiting
    dismissed.value = false
  }
}

function watchInstallation() {
  installingWorker?.removeEventListener('statechange', showUpdate)
  installingWorker = registration.installing
  installingWorker?.addEventListener('statechange', showUpdate)
}

function reloadAfterUpdate() {
  if (refreshing.value) {
    window.clearTimeout(refreshTimeout)
    window.location.reload()
  }
}

function reportPageAssets(event) {
  if (event.data?.type !== 'GET_PAGE_ASSETS') return
  const assets = [...document.querySelectorAll('script[type="module"][src], link[rel="stylesheet"][href]')]
    .map(element => element.src || element.href)
  event.ports[0]?.postMessage(assets)
}

function applyUpdate() {
  error.value = ''
  refreshing.value = true
  const worker = registration.waiting || waitingWorker.value
  if (worker.state === 'activated' || worker.state === 'redundant') {
    window.location.reload()
    return
  }
  try {
    refreshTimeout = window.setTimeout(() => {
      refreshing.value = false
      error.value = '更新未完成，请重试'
    }, 10000)
    worker.postMessage({ type: 'SKIP_WAITING' })
  } catch {
    window.clearTimeout(refreshTimeout)
    refreshing.value = false
    error.value = '更新未能启用，请重试'
  }
}

function checkForUpdate() {
  if (document.visibilityState === 'visible' && navigator.onLine) {
    navigator.serviceWorker.controller?.postMessage({ type: 'CLIENT_READY' })
    // A failed update check must leave the current offline version usable.
    registration?.update().catch(() => {})
  }
}

onMounted(async () => {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return
  navigator.serviceWorker.addEventListener('message', reportPageAssets)
  try {
    registration = await navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' })
    if (disposed) return
    navigator.serviceWorker.addEventListener('controllerchange', reloadAfterUpdate)
    registration.addEventListener('updatefound', watchInstallation)
    watchInstallation()
    showUpdate()
    navigator.serviceWorker.controller?.postMessage({ type: 'CLIENT_READY' })
    document.addEventListener('visibilitychange', checkForUpdate)
    window.addEventListener('online', checkForUpdate)
  } catch (error) {
    console.warn('无法启用离线缓存，下次访问时重试。', error)
  }
})

onUnmounted(() => {
  disposed = true
  window.clearTimeout(refreshTimeout)
  registration?.removeEventListener('updatefound', watchInstallation)
  installingWorker?.removeEventListener('statechange', showUpdate)
  navigator.serviceWorker?.removeEventListener('controllerchange', reloadAfterUpdate)
  navigator.serviceWorker?.removeEventListener('message', reportPageAssets)
  document.removeEventListener('visibilitychange', checkForUpdate)
  window.removeEventListener('online', checkForUpdate)
})
</script>
