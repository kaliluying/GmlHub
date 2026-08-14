<template>
  <div class="personal-info-panel h-full overflow-auto p-4 sm:p-5 text-hud-text">
    <div class="mx-auto max-w-3xl space-y-4">
      <section class="panel-card p-4">
        <h2 class="text-lg font-semibold tracking-wide">{{ panelTitle }}</h2>
        <p class="mt-2 text-sm text-hud-muted">{{ windowData.description }}</p>
        <div v-if="details.length" class="mt-3 space-y-2">
          <p v-for="(item, index) in details" :key="`detail-${index}`" class="text-sm text-hud-text">
            {{ item }}
          </p>
        </div>
      </section>

      <section v-if="quickFacts.length" class="panel-card p-4">
        <h3 class="text-sm font-semibold text-hud-text">关键信息</h3>
        <div class="mt-3 grid gap-2 sm:grid-cols-2">
          <div
            v-for="fact in quickFacts"
            :key="`${fact.label}-${fact.value}`"
            class="panel-sub-card px-3 py-2"
          >
            <p class="text-xs text-hud-muted">{{ fact.label }}</p>
            <p class="mt-1 text-sm text-hud-text">{{ fact.value }}</p>
          </div>
        </div>
      </section>

      <section v-if="evidence.length" class="panel-card p-4">
        <h3 class="text-sm font-semibold text-hud-text">项目证据</h3>
        <div class="mt-3 grid gap-2">
          <button
            v-for="item in evidence"
            :key="item.id"
            type="button"
            class="w-full panel-sub-card px-3 py-2 text-left transition hover:border-cyan-300/60 hover:bg-cyan-950/30"
            @click="openLink(item.url)"
          >
            <p class="text-sm font-medium text-hud-text">{{ item.name }}</p>
            <p class="mt-1 text-xs text-hud-muted">{{ item.meta }}</p>
          </button>
        </div>
      </section>

      <section v-if="actions.length" class="panel-card p-4">
        <h3 class="text-sm font-semibold text-hud-text">快捷操作</h3>
        <div class="mt-3 flex flex-wrap gap-2">
          <button
            v-for="action in actions"
            :key="action.id"
            type="button"
            class="rounded-lg border border-cyan-300/35 bg-cyan-900/25 px-3 py-1.5 text-xs text-cyan-100 transition duration-200 ease-hud hover:border-cyan-200/70 hover:bg-cyan-800/35 hover:-translate-y-0.5"
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

<style scoped>
.personal-info-panel {
  color: #182235;
  background:
    radial-gradient(circle at 84% 4%, rgba(203, 222, 255, 0.4), transparent 32%),
    linear-gradient(145deg, rgba(248, 251, 255, 0.58), rgba(229, 238, 249, 0.44));
}

.personal-info-panel :deep(.panel-card) {
  border-color: rgba(255, 255, 255, 0.74);
  background: rgba(255, 255, 255, 0.46);
  box-shadow: 0 18px 42px rgba(100, 119, 148, 0.1), 0 2px 0 rgba(255, 255, 255, 0.72) inset;
}

.personal-info-panel :deep(.panel-sub-card) {
  border-color: rgba(116, 133, 158, 0.16);
  background: rgba(255, 255, 255, 0.34);
}

.personal-info-panel :deep(.panel-sub-card:hover) {
  border-color: rgba(91, 131, 206, 0.32);
  background: rgba(255, 255, 255, 0.64);
}

.personal-info-panel :deep(button.rounded-lg) {
  border-color: rgba(91, 131, 206, 0.24);
  color: #5579bd;
  background: rgba(224, 236, 255, 0.54);
}

.personal-info-panel :deep(button.rounded-lg:hover) {
  border-color: rgba(91, 131, 206, 0.42);
  color: #3f63a5;
  background: rgba(224, 236, 255, 0.82);
}

.personal-info-panel :deep(.text-emerald-300) {
  color: #278d6a;
}
</style>
