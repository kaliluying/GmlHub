<template>
  <div class="h-full overflow-auto p-4 sm:p-5 text-slate-100">
    <div class="mx-auto max-w-3xl space-y-4">
      <section class="rounded-xl border border-slate-400/30 bg-slate-900/45 p-4">
        <h2 class="text-lg font-semibold tracking-wide">{{ panelTitle }}</h2>
        <p class="mt-2 text-sm text-slate-300">{{ windowData.description }}</p>
        <div v-if="details.length" class="mt-3 space-y-2">
          <p v-for="(item, index) in details" :key="`detail-${index}`" class="text-sm text-slate-200/95">
            {{ item }}
          </p>
        </div>
      </section>

      <section v-if="quickFacts.length" class="rounded-xl border border-slate-400/30 bg-slate-900/35 p-4">
        <h3 class="text-sm font-semibold text-slate-200">关键信息</h3>
        <div class="mt-3 grid gap-2 sm:grid-cols-2">
          <div
            v-for="fact in quickFacts"
            :key="`${fact.label}-${fact.value}`"
            class="rounded-lg border border-slate-500/30 bg-slate-950/45 px-3 py-2"
          >
            <p class="text-xs text-slate-400">{{ fact.label }}</p>
            <p class="mt-1 text-sm text-slate-100">{{ fact.value }}</p>
          </div>
        </div>
      </section>

      <section v-if="evidence.length" class="rounded-xl border border-slate-400/30 bg-slate-900/35 p-4">
        <h3 class="text-sm font-semibold text-slate-200">项目证据</h3>
        <div class="mt-3 grid gap-2">
          <button
            v-for="item in evidence"
            :key="item.id"
            type="button"
            class="w-full rounded-lg border border-slate-500/35 bg-slate-950/45 px-3 py-2 text-left transition hover:border-cyan-300/60 hover:bg-cyan-950/30"
            @click="openLink(item.url)"
          >
            <p class="text-sm font-medium text-slate-100">{{ item.name }}</p>
            <p class="mt-1 text-xs text-slate-400">{{ item.meta }}</p>
          </button>
        </div>
      </section>

      <section v-if="actions.length" class="rounded-xl border border-slate-400/30 bg-slate-900/35 p-4">
        <h3 class="text-sm font-semibold text-slate-200">快捷操作</h3>
        <div class="mt-3 flex flex-wrap gap-2">
          <button
            v-for="action in actions"
            :key="action.id"
            type="button"
            class="rounded-lg border border-cyan-300/35 bg-cyan-900/25 px-3 py-1.5 text-xs text-cyan-100 transition hover:border-cyan-200/70 hover:bg-cyan-800/35"
            @click="runAction(action)"
          >
            {{ action.label }}
          </button>
        </div>
        <p v-if="feedback" class="mt-2 text-xs text-emerald-300">{{ feedback }}</p>
      </section>
    </div>
  </div>
</template>

<script setup>
import { computed, onUnmounted, ref } from 'vue'

const props = defineProps({
  windowData: {
    type: Object,
    required: true,
  },
})

const feedback = ref('')
let feedbackTimer = null

const panelTitle = computed(() => props.windowData.detailTitle || props.windowData.title || '个人信息')
const details = computed(() => Array.isArray(props.windowData.details) ? props.windowData.details : [])
const quickFacts = computed(() => Array.isArray(props.windowData.quickFacts) ? props.windowData.quickFacts : [])
const evidence = computed(() => Array.isArray(props.windowData.evidence) ? props.windowData.evidence : [])
const actions = computed(() => Array.isArray(props.windowData.actions) ? props.windowData.actions : [])

const openLink = (url) => {
  if (!url || typeof window === 'undefined') return
  window.open(url, '_blank', 'noopener,noreferrer')
}

const showFeedback = (text) => {
  feedback.value = text
  if (feedbackTimer) {
    clearTimeout(feedbackTimer)
    feedbackTimer = null
  }

  feedbackTimer = setTimeout(() => {
    feedback.value = ''
    feedbackTimer = null
  }, 2000)
}

const copyText = async (value) => {
  if (!value) return
  feedback.value = ''

  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(value)
      showFeedback(`已复制: ${value}`)
      return
    } catch {
    }
  }

  if (typeof document === 'undefined') return
  const input = document.createElement('textarea')
  input.value = value
  input.setAttribute('readonly', '')
  input.style.position = 'fixed'
  input.style.left = '-9999px'
  document.body.appendChild(input)
  input.select()

  try {
    document.execCommand('copy')
    showFeedback(`已复制: ${value}`)
  } finally {
    document.body.removeChild(input)
  }
}

const runAction = (action) => {
  if (!action || !action.type) return
  if (action.type === 'link') {
    openLink(action.value)
    return
  }
  if (action.type === 'copy') {
    copyText(action.value)
  }
}

onUnmounted(() => {
  if (!feedbackTimer) return
  clearTimeout(feedbackTimer)
  feedbackTimer = null
})
</script>
