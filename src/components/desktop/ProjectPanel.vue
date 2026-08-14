<template>
  <div class="project-panel h-full overflow-y-auto p-5 sm:p-7">
    <div class="project-panel-head">
      <div>
        <span class="project-kicker">PROJECT CONTENT / {{ app.id }}</span>
        <h2>{{ app.name }}</h2>
        <p>{{ app.description }}</p>
      </div>
      <span class="project-status" :class="statusClass">{{ statusText }}</span>
    </div>

    <p class="project-summary">{{ app.content || '这个项目暂未补充内容说明。' }}</p>

    <div v-if="stack.length" class="project-section">
      <span class="project-section-label">技术栈</span>
      <div class="project-tags">
        <span v-for="item in stack" :key="item" class="project-tag">{{ item }}</span>
      </div>
    </div>

    <div class="project-section project-links">
      <span class="project-section-label">入口</span>
      <div class="project-actions">
        <button v-if="app.url" type="button" class="project-action project-action-primary" @click="openDemo">
          打开项目
        </button>
        <button v-if="app.repoUrl" type="button" class="project-action" @click="openRepository">
          查看源码
        </button>
      </div>
    </div>

    <div class="project-note">
      <span class="project-note-dot" />
      状态只表示最近一次网络可达性探测，不代表项目内部业务健康度。
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useDesktopStore } from '../../stores/desktop.js'

const props = defineProps({
  windowData: {
    type: Object,
    required: true,
  },
})

const store = useDesktopStore()

const app = computed(() => store.apps.find(item => item.id === props.windowData.projectAppId) || props.windowData)
const stack = computed(() => app.value.stack || [])
const statusText = computed(() => {
  if (app.value.launchMode === 'internal') return '本地'
  if (app.value.status === 'reachable') return '可访问'
  if (app.value.status === 'unreachable') return '不可达'
  return '待检查'
})
const statusClass = computed(() => `is-${app.value.status || 'unknown'}`)

const openDemo = () => {
  if (!app.value.url) return
  store.openWindow(app.value.id)
}

const openRepository = () => {
  if (!app.value.repoUrl || typeof window === 'undefined') return
  window.open(app.value.repoUrl, '_blank', 'noopener,noreferrer')
}
</script>

<style scoped>
.project-panel {
  color: rgba(226, 232, 240, 0.92);
  background:
    radial-gradient(circle at 86% 5%, rgba(56, 189, 248, 0.13), transparent 30%),
    linear-gradient(145deg, rgba(15, 23, 42, 0.72), rgba(2, 6, 23, 0.8));
}

.project-panel-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
}

.project-kicker,
.project-section-label {
  color: rgba(125, 211, 252, 0.72);
  font-family: 'Cascadia Code', 'SFMono-Regular', Consolas, monospace;
  font-size: 0.62rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.project-panel h2 {
  margin-top: 0.5rem;
  color: #f8fafc;
  font-size: clamp(1.4rem, 3vw, 2rem);
  font-weight: 700;
}

.project-panel-head p {
  margin-top: 0.45rem;
  color: rgba(186, 230, 253, 0.72);
  font-size: 0.84rem;
  line-height: 1.65;
}

.project-status {
  flex: 0 0 auto;
  border: 1px solid rgba(148, 163, 184, 0.24);
  border-radius: 999px;
  padding: 0.35rem 0.65rem;
  color: rgba(226, 232, 240, 0.82);
  background: rgba(100, 116, 139, 0.18);
  font-size: 0.68rem;
}

.project-status.is-reachable {
  border-color: rgba(52, 211, 153, 0.42);
  color: rgb(167, 243, 208);
  background: rgba(16, 185, 129, 0.14);
}

.project-status.is-unreachable {
  border-color: rgba(251, 113, 133, 0.42);
  color: rgb(254, 205, 211);
  background: rgba(244, 63, 94, 0.14);
}

.project-summary {
  margin-top: 1.65rem;
  border-left: 2px solid rgba(56, 189, 248, 0.56);
  padding-left: 0.9rem;
  color: rgba(226, 232, 240, 0.86);
  font-size: 0.94rem;
  line-height: 1.8;
}

.project-section {
  margin-top: 1.7rem;
}

.project-tags,
.project-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.55rem;
  margin-top: 0.7rem;
}

.project-tag {
  border: 1px solid rgba(125, 211, 252, 0.2);
  border-radius: 0.6rem;
  padding: 0.42rem 0.6rem;
  color: rgba(186, 230, 253, 0.84);
  background: rgba(14, 165, 233, 0.1);
  font-size: 0.72rem;
}

.project-action {
  border: 1px solid rgba(148, 163, 184, 0.28);
  border-radius: 0.65rem;
  padding: 0.55rem 0.8rem;
  color: rgba(226, 232, 240, 0.9);
  background: rgba(15, 23, 42, 0.58);
  font-size: 0.76rem;
  transition: border-color 160ms ease, background 160ms ease, transform 160ms ease;
}

.project-action:hover {
  border-color: rgba(125, 211, 252, 0.5);
  background: rgba(14, 165, 233, 0.16);
  transform: translateY(-1px);
}

.project-action-primary {
  border-color: rgba(45, 212, 191, 0.42);
  color: rgb(204, 251, 241);
  background: rgba(13, 148, 136, 0.22);
}

.project-note {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 2rem;
  color: rgba(148, 163, 184, 0.76);
  font-size: 0.68rem;
  line-height: 1.6;
}

.project-note-dot {
  width: 0.42rem;
  height: 0.42rem;
  flex: 0 0 auto;
  border-radius: 999px;
  background: rgb(56, 189, 248);
  box-shadow: 0 0 12px rgba(56, 189, 248, 0.8);
}

/* Liquid glass project details */
.project-panel {
  color: #182235;
  background:
    radial-gradient(circle at 86% 5%, rgba(203, 222, 255, 0.46), transparent 30%),
    linear-gradient(145deg, rgba(248, 251, 255, 0.64), rgba(229, 238, 249, 0.52));
}

.project-kicker,
.project-section-label {
  color: #73819a;
  font-family: inherit;
  letter-spacing: 0.03em;
  text-transform: none;
}

.project-panel h2 {
  color: #182235;
}

.project-panel-head p,
.project-note {
  color: #718099;
}

.project-status {
  border-color: rgba(116, 133, 158, 0.2);
  color: #66748b;
  background: rgba(255, 255, 255, 0.42);
}

.project-status.is-reachable {
  border-color: rgba(75, 177, 139, 0.32);
  color: #278d6a;
  background: rgba(75, 177, 139, 0.12);
}

.project-status.is-unreachable {
  border-color: rgba(200, 94, 109, 0.32);
  color: #b65060;
  background: rgba(200, 94, 109, 0.11);
}

.project-summary {
  border-left-color: rgba(91, 131, 206, 0.52);
  color: #344056;
}

.project-tag {
  border-color: rgba(255, 255, 255, 0.72);
  color: #5579bd;
  background: rgba(224, 236, 255, 0.54);
  box-shadow: 0 1px 0 rgba(255, 255, 255, 0.68) inset;
}

.project-action {
  border-color: rgba(116, 133, 158, 0.22);
  color: #344056;
  background: rgba(255, 255, 255, 0.42);
}

.project-action:hover {
  border-color: rgba(91, 131, 206, 0.38);
  background: rgba(224, 236, 255, 0.72);
}

.project-action-primary {
  border-color: rgba(75, 177, 139, 0.32);
  color: #278d6a;
  background: rgba(75, 177, 139, 0.12);
}

.project-note-dot {
  background: #7aa6ed;
  box-shadow: 0 0 0 0.22rem rgba(122, 166, 237, 0.12);
}
</style>
