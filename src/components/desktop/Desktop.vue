<template>
  <div 
    class="desktop w-full h-full relative overflow-hidden"
    :style="desktopStyle"
    @contextmenu.prevent="showContextMenu"
    @mousemove="handlePointerMove"
    @mouseleave="resetPointer"
  >
    <transition name="boot-fade">
      <div v-if="showBootSequence" class="boot-sequence">
        <div class="boot-scan-layer" />
        <div class="boot-noise-layer" />
        <span
          v-for="particle in bootParticles"
          :key="particle.id"
          class="boot-particle"
          :style="bootParticleStyle(particle)"
        />
        <div class="boot-core">
          <div class="boot-orbit">
            <div class="boot-orbit-ring" />
            <div class="boot-logo">Personal OS</div>
          </div>
          <div class="boot-subtitle">智能工作台正在唤醒</div>
          <div class="boot-progress-track">
            <div class="boot-progress-fill" :style="{ width: `${bootProgress}%` }" />
          </div>
          <transition name="boot-status" mode="out-in">
            <div :key="bootStatusText" class="boot-progress-text">{{ bootStatusText }}</div>
          </transition>
        </div>
      </div>
    </transition>

    <!-- 壁纸层 -->
    <div class="absolute inset-0 z-0" :style="wallpaperStyle" />
    <div class="tech-grid-layer absolute inset-0 z-[1]" />
    <div class="tech-scan-layer absolute inset-0 z-[2]" />
    <div class="tech-glow-layer absolute inset-0 z-[3]" />
    <div
      v-for="node in techNodes"
      :key="node.id"
      class="tech-node"
      :style="nodeStyle(node)"
    />
    <div class="tech-beam beam-a" />
    <div class="tech-beam beam-b" />
    <div class="cyber-pointer-glow" :style="pointerGlowStyle" />
    <div class="cyber-noise-layer" />
    <div v-if="store.settings.codeRainEnabled" class="cyber-code-rain">
      <span
        v-for="column in visibleCodeColumns"
        :key="column.id"
        class="code-column"
        :style="codeColumnStyle(column)"
      >
        {{ column.text }}
      </span>
    </div>
    <div class="absolute inset-0 z-[8] pointer-events-none bg-[radial-gradient(circle_at_16%_20%,rgba(255,255,255,0.08),transparent_56%),radial-gradient(circle_at_82%_78%,rgba(14,165,233,0.08),transparent_48%)]" />
    <div class="ambient-wave wave-a bg-[radial-gradient(circle,rgba(56,189,248,0.12)_0%,rgba(56,189,248,0)_68%)]" />
    <div class="ambient-wave wave-b bg-[radial-gradient(circle,rgba(125,211,252,0.12)_0%,rgba(125,211,252,0)_68%)]" />
    <div class="ambient-orb w-72 h-72 -top-36 -left-32 bg-cyan-200/14" />
    <div class="ambient-orb w-96 h-96 bottom-[-140px] right-[-90px] bg-sky-300/18" />
    
    <!-- 顶部菜单栏 -->
    <div class="menu-bar fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-3 md:px-5">
      <div class="menu-brand-group">
        <span class="menu-apple">🍎</span>
        <span class="menu-title">个人OS</span>
        <span class="menu-divider hidden md:block" />
        <div class="menu-nav hidden xl:flex">
          <span class="menu-nav-item">文件</span>
          <span class="menu-nav-item">编辑</span>
          <span class="menu-nav-item">窗口</span>
        </div>
      </div>
      <div class="menu-right-group relative">
        <div class="hidden lg:block">
          <button
            ref="statusButtonRef"
            class="status-trigger menu-chip-cluster flex items-center gap-1.5 text-[11px]"
            type="button"
            @click.stop="toggleStatusPanel"
          >
          <span class="status-pill bg-emerald-400/25 text-emerald-100">在线 {{ store.serviceSummary.online }}</span>
          <span class="status-pill bg-rose-300/25 text-rose-100">离线 {{ store.serviceSummary.offline }}</span>
          <span v-if="store.isMonitoringStatus" class="status-pill bg-cyan-300/25 text-cyan-100">检测中</span>
          </button>

          <div v-if="statusPanelOpen" ref="statusPanelRef" class="status-panel glass-strong">
            <div class="status-panel-head">
              <span>服务状态</span>
              <span class="status-panel-time">{{ lastCheckLabel }}</span>
            </div>

            <div class="status-panel-grid">
              <section>
                <p class="status-panel-title text-emerald-200">在线服务 ({{ onlineServiceApps.length }})</p>
                <div v-if="onlineServiceApps.length" class="status-panel-list">
                  <button
                    v-for="app in onlineServiceApps"
                    :key="`online-${app.id}`"
                    type="button"
                    class="status-app-row status-app-row-button"
                    @click="openStatusService(app.id)"
                  >
                    <span>{{ app.name }}</span>
                    <span class="status-app-domain">{{ app.domain }}</span>
                  </button>
                </div>
                <p v-else class="status-empty">暂无在线服务</p>
              </section>

              <section>
                <p class="status-panel-title text-rose-200">离线服务 ({{ offlineServiceApps.length }})</p>
                <div v-if="offlineServiceApps.length" class="status-panel-list">
                  <button
                    v-for="app in offlineServiceApps"
                    :key="`offline-${app.id}`"
                    type="button"
                    class="status-app-row status-app-row-button"
                    @click="openStatusService(app.id)"
                  >
                    <span>{{ app.name }}</span>
                    <span class="status-app-domain">{{ app.domain }}</span>
                  </button>
                </div>
                <p v-else class="status-empty">暂无离线服务</p>
              </section>
            </div>
          </div>
        </div>
        <button
          class="menu-action-btn menu-utility-btn"
          @click="changeWallpaper"
        >
          换风格
        </button>
        <button
          class="menu-shortcut-btn menu-utility-btn"
          @click="openLauncher"
        >
          Ctrl+K
        </button>
        <span class="menu-clock">{{ currentTime }}</span>
      </div>
    </div>

    <div v-if="launcher.open" class="launcher-overlay" @click="closeLauncher">
      <div class="launcher-panel glass-strong" @click.stop>
        <input
          ref="launcherInput"
          v-model="launcher.query"
          class="launcher-input"
          type="text"
          placeholder="搜索应用：Tools / 知识库 / 密码箱 / 博客..."
          @keydown.enter.prevent="launchSelected"
          @keydown.down.prevent="moveSelection(1)"
          @keydown.up.prevent="moveSelection(-1)"
          @keydown.esc.prevent="closeLauncher"
        />
        <div v-if="!launcher.query && (store.pinnedApps.length || store.recentApps.length)" class="launcher-quick-zones">
          <div v-if="store.pinnedApps.length" class="launcher-quick-row">
            <span class="launcher-quick-label">置顶</span>
            <button
              v-for="app in store.pinnedApps"
              :key="`pin-${app.id}`"
              class="launcher-chip"
              @click="openFromLauncher(app.id)"
            >
              {{ app.icon }} {{ app.name }}
            </button>
          </div>
          <div v-if="store.recentApps.length" class="launcher-quick-row">
            <span class="launcher-quick-label">最近</span>
            <button
              v-for="app in store.recentApps"
              :key="`recent-${app.id}`"
              class="launcher-chip launcher-chip-muted"
              @click="openFromLauncher(app.id)"
            >
              {{ app.icon }} {{ app.name }}
            </button>
          </div>
        </div>
        <div class="launcher-list">
          <button
            v-for="(app, idx) in launcherApps"
            :key="app.id"
            class="launcher-item"
            :class="{ 'is-active': idx === launcher.selectedIndex }"
            @click="openFromLauncher(app.id)"
            @mousemove="setSelectedIndex(idx)"
          >
            <span class="text-lg">{{ app.icon }}</span>
            <span class="flex flex-col items-start min-w-0">
              <span class="font-medium truncate max-w-full">{{ app.name }}</span>
                <span class="text-xs text-slate-300 truncate max-w-full">{{ app.domain || app.description }}</span>
            </span>
            <span class="launcher-actions">
              <button
                class="pin-toggle"
                :class="{ 'is-pinned': isPinned(app.id) }"
                @click.stop="togglePinned(app.id)"
              >
                ★
              </button>
              <span class="launcher-status" :class="`status-${app.status || 'local'}`">{{ statusText(app.status) }}</span>
            </span>
          </button>
          <div v-if="!launcherApps.length" class="px-4 py-6 text-center text-sm text-slate-300">
            没找到匹配应用
          </div>
        </div>
      </div>
    </div>
    
    <div class="desktop-workspace relative z-20 pt-14 md:pt-[4.1rem] px-4 pb-32 md:pb-36 md:px-10">
      <div class="desktop-main-grid">
        <div
          class="desktop-icons grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-3 sm:gap-4 md:gap-5 content-start"
          :class="desktopIconGridClass"
          @dragover.prevent="handleIconGridDragOver"
          @drop.prevent="handleIconGridDrop"
        >
          <AppIcon
            v-for="app in store.desktopApps"
            :key="app.id"
            :app="app"
            :icon-size="store.settings.iconSize"
            :is-dragging="dragState.draggedId === app.id"
            :is-drop-target="dragState.targetId === app.id"
            @drag-start-icon="handleIconDragStart"
            @drag-enter-icon="handleIconDragEnter"
            @drag-leave-icon="handleIconDragLeave"
            @drag-over-icon="handleIconDragOver"
            @drop-icon="handleIconDrop"
            @drag-end-icon="handleIconDragEnd"
          />
        </div>

        <aside class="desktop-side-panel hidden xl:grid gap-3 content-start">
          <section class="widget-card">
            <h3 class="widget-title">系统概览</h3>
            <div class="widget-metric-row">
              <span>可用率</span>
              <strong>{{ availabilityRate }}%</strong>
            </div>
            <div class="widget-metric-row">
              <span>在线</span>
              <strong class="text-emerald-300">{{ store.serviceSummary.online }}</strong>
            </div>
            <div class="widget-metric-row">
              <span>离线</span>
              <strong class="text-rose-300">{{ store.serviceSummary.offline }}</strong>
            </div>
            <div class="widget-sub mt-2">最近检测: {{ lastCheckLabel }}</div>
          </section>

          <section class="widget-card">
            <h3 class="widget-title">快捷访问</h3>
            <button
              v-for="app in panelQuickApps"
              :key="`quick-${app.id}`"
              class="widget-link"
              @click="openWidgetApp(app.id)"
            >
              <span class="widget-link-left">
                <span class="text-base">{{ app.icon }}</span>
                <span>{{ app.name }}</span>
              </span>
              <span class="widget-link-domain">{{ app.domain }}</span>
            </button>
          </section>

          <section class="widget-card">
            <h3 class="widget-title">桌面状态</h3>
            <div class="widget-metric-row"><span>当前风格</span><strong>{{ activePresetLabel }}</strong></div>
            <div class="widget-metric-row"><span>动效强度</span><strong>{{ motionLevelLabel }}</strong></div>
            <div class="widget-metric-row"><span>代码雨</span><strong>{{ store.settings.codeRainEnabled ? '开启' : '关闭' }}</strong></div>
            <div class="widget-sub mt-2">时钟 {{ currentTime }}</div>
          </section>
        </aside>
      </div>
    </div>
    
    <!-- 窗口层 -->
    <Window
      v-for="window in store.windows"
      :key="window.id"
      :window="window"
    />
    
    <!-- Dock -->
    <Dock v-if="store.settings.showDock" class="z-30" />
    
    <!-- 右键菜单 -->
    <ContextMenu
      :show="contextMenu.show"
      :x="contextMenu.x"
      :y="contextMenu.y"
      :items="desktopMenuItems"
      :min-width="160"
      :z-index="120"
      @select="handleDesktopMenuSelect"
      @close="hideContextMenu"
    />
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { useDesktopStore } from '../../stores/desktop.js'
import AppIcon from './AppIcon.vue'
import Window from './Window.vue'
import Dock from './Dock.vue'
import ContextMenu from './ContextMenu.vue'

const store = useDesktopStore()
const currentTime = ref('')
const contextMenu = ref({ show: false, x: 0, y: 0 })
const pointer = ref({ x: 50, y: 50, active: false })
const launcherInput = ref(null)
const launcher = ref({ open: false, query: '', selectedIndex: 0 })
const dragState = ref({ draggedId: null, targetId: null })
const statusPanelOpen = ref(false)
const statusPanelRef = ref(null)
const statusButtonRef = ref(null)
const prefersReducedMotion = ref(false)
const isPageVisible = ref(true)
const showBootSequence = ref(false)
const bootProgress = ref(0)
const DESKTOP_MENU_EVENT = 'desktop:context-menu-open'
const ICON_MENU_EVENT = 'desktop:icon-context-menu-open'
const BOOT_SEEN_STORAGE_KEY = 'desktop.bootSeen'
let reducedMotionMedia = null
let bootProgressTimer = null
let bootFinishTimer = null

const wallpaperPresets = [
  {
    id: 'deep-net',
    background: '#040912',
    wallpaper: 'radial-gradient(circle at 14% 18%, rgba(56, 189, 248, 0.2) 0%, rgba(56, 189, 248, 0) 38%), radial-gradient(circle at 84% 74%, rgba(45, 212, 191, 0.16) 0%, rgba(45, 212, 191, 0) 42%), linear-gradient(132deg, #040912 0%, #09172d 46%, #0e2c44 100%)',
    gridRgb: '56, 189, 248',
    scanRgb: '125, 211, 252',
    glowARgb: '34, 211, 238',
    glowBRgb: '96, 165, 250',
    glowCRgb: '45, 212, 191',
    beamRgb: '56, 189, 248',
    nodeRgb: '186, 230, 253',
    codeRgb: '125, 211, 252',
  },
  {
    id: 'neon-core',
    background: '#15030e',
    wallpaper: 'radial-gradient(circle at 20% 22%, rgba(251, 113, 133, 0.25) 0%, rgba(251, 113, 133, 0) 36%), radial-gradient(circle at 78% 78%, rgba(244, 63, 94, 0.2) 0%, rgba(244, 63, 94, 0) 44%), linear-gradient(136deg, #17040f 0%, #2a0a1f 48%, #3c1332 100%)',
    gridRgb: '251, 113, 133',
    scanRgb: '253, 164, 175',
    glowARgb: '244, 63, 94',
    glowBRgb: '190, 24, 93',
    glowCRgb: '249, 168, 212',
    beamRgb: '244, 63, 94',
    nodeRgb: '254, 205, 211',
    codeRgb: '253, 164, 175',
  },
  {
    id: 'quantum-green',
    background: '#03120a',
    wallpaper: 'radial-gradient(circle at 18% 74%, rgba(52, 211, 153, 0.22) 0%, rgba(52, 211, 153, 0) 42%), radial-gradient(circle at 82% 20%, rgba(16, 185, 129, 0.2) 0%, rgba(16, 185, 129, 0) 38%), linear-gradient(134deg, #04160d 0%, #093321 50%, #0f4b2f 100%)',
    gridRgb: '52, 211, 153',
    scanRgb: '110, 231, 183',
    glowARgb: '16, 185, 129',
    glowBRgb: '20, 184, 166',
    glowCRgb: '110, 231, 183',
    beamRgb: '16, 185, 129',
    nodeRgb: '187, 247, 208',
    codeRgb: '110, 231, 183',
  },
  {
    id: 'signal-amber',
    background: '#130b02',
    wallpaper: 'radial-gradient(circle at 14% 26%, rgba(251, 191, 36, 0.25) 0%, rgba(251, 191, 36, 0) 40%), radial-gradient(circle at 80% 70%, rgba(245, 158, 11, 0.2) 0%, rgba(245, 158, 11, 0) 46%), linear-gradient(134deg, #180d03 0%, #3a2208 52%, #5a360f 100%)',
    gridRgb: '251, 191, 36',
    scanRgb: '253, 224, 71',
    glowARgb: '245, 158, 11',
    glowBRgb: '251, 146, 60',
    glowCRgb: '253, 230, 138',
    beamRgb: '251, 191, 36',
    nodeRgb: '254, 243, 199',
    codeRgb: '253, 224, 71',
  },
]

const techNodes = [
  { id: 'n1', top: '16%', left: '14%', size: 8, delay: '0s', duration: '3.8s' },
  { id: 'n2', top: '24%', left: '42%', size: 10, delay: '1.2s', duration: '4.4s' },
  { id: 'n3', top: '38%', left: '74%', size: 9, delay: '0.8s', duration: '3.6s' },
  { id: 'n4', top: '56%', left: '18%', size: 12, delay: '1.6s', duration: '4.8s' },
  { id: 'n5', top: '64%', left: '46%', size: 9, delay: '0.3s', duration: '4s' },
  { id: 'n6', top: '72%', left: '82%', size: 11, delay: '2s', duration: '5.2s' },
]

const codeColumns = [
  { id: 'c1', left: '4%', delay: '0s', duration: '15s', text: '1011001 01011 1110 001 1100101' },
  { id: 'c2', left: '13%', delay: '2s', duration: '18s', text: 'SYN 4F B7 A1 C9 D2 8E 77' },
  { id: 'c3', left: '22%', delay: '1.2s', duration: '14s', text: '0x7f 0x18 0xff 0x2a 0x41' },
  { id: 'c4', left: '31%', delay: '3.1s', duration: '16s', text: 'AI CORE > boot.sequence.pass' },
  { id: 'c5', left: '40%', delay: '0.6s', duration: '19s', text: '110010 001011 011110 100001' },
  { id: 'c6', left: '49%', delay: '2.4s', duration: '17s', text: 'SYS CLOCK 14:34:10 // ONLINE' },
  { id: 'c7', left: '58%', delay: '1.8s', duration: '15.5s', text: 'AUTH BRIDGE // token refresh cycle' },
  { id: 'c8', left: '67%', delay: '0.9s', duration: '18.4s', text: '0x91 0x2c 0xaf 0x44 0x10 0xff' },
  { id: 'c9', left: '76%', delay: '2.9s', duration: '16.2s', text: 'NEURAL NET > route.trace.enabled' },
  { id: 'c10', left: '85%', delay: '1.4s', duration: '17.6s', text: '001101 111000 010101 100111' },
  { id: 'c11', left: '93%', delay: '3.3s', duration: '19.2s', text: 'EDGE LINK // heartbeat stable' },
]

const bootParticles = [
  { id: 'bp1', top: '16%', left: '12%', size: 8, delay: '0s', duration: '3.4s' },
  { id: 'bp2', top: '26%', left: '82%', size: 6, delay: '0.8s', duration: '4.2s' },
  { id: 'bp3', top: '38%', left: '22%', size: 10, delay: '1.2s', duration: '3.8s' },
  { id: 'bp4', top: '52%', left: '74%', size: 7, delay: '0.4s', duration: '4.1s' },
  { id: 'bp5', top: '66%', left: '15%', size: 9, delay: '1.6s', duration: '3.5s' },
  { id: 'bp6', top: '72%', left: '88%', size: 6, delay: '2s', duration: '4.4s' },
]

const defaultPresetId = wallpaperPresets[0].id
const activePreset = computed(() => {
  const preset = wallpaperPresets.find(item => item.id === store.settings.wallpaper)
  return preset || wallpaperPresets[0]
})

const motionProfiles = {
  low: { opacity: 0.72, speed: 1.35, pointer: 0.62 },
  medium: { opacity: 1, speed: 1, pointer: 1 },
  high: { opacity: 1.16, speed: 0.84, pointer: 1.2 },
}

const effectiveMotionLevel = computed(() => {
  if (prefersReducedMotion.value) return 'low'
  return store.settings.motionLevel
})

const motionProfile = computed(() => motionProfiles[effectiveMotionLevel.value] || motionProfiles.medium)

const visibleCodeColumns = computed(() => {
  if (effectiveMotionLevel.value === 'low') return codeColumns.slice(0, 6)
  if (effectiveMotionLevel.value === 'medium') return codeColumns.slice(0, 9)
  return codeColumns
})

const filteredApps = computed(() => {
  const query = launcher.value.query.trim().toLowerCase()
  if (!query) return store.desktopApps

  return store.desktopApps.filter(app => {
    const name = app.name.toLowerCase()
    const desc = app.description?.toLowerCase() || ''
    const domain = app.domain?.toLowerCase() || ''
    return name.includes(query) || desc.includes(query) || domain.includes(query)
  })
})

const launcherApps = computed(() => {
  const query = launcher.value.query.trim().toLowerCase()
  const pinnedSet = new Set(store.pinnedAppIds)
  const recentSet = new Set(store.recentAppIds)

  if (query) {
    return [...filteredApps.value].sort((a, b) => {
      const aPinned = pinnedSet.has(a.id) ? 1 : 0
      const bPinned = pinnedSet.has(b.id) ? 1 : 0
      if (aPinned !== bPinned) return bPinned - aPinned
      return a.name.localeCompare(b.name, 'zh-CN')
    })
  }

  const pinned = store.pinnedApps
  const recent = store.recentApps.filter(app => !pinnedSet.has(app.id))
  const others = store.desktopApps.filter(app => !pinnedSet.has(app.id) && !recentSet.has(app.id))
  return [...pinned, ...recent, ...others]
})

const desktopIconGridClass = computed(() => {
  if (store.settings.iconSize === 'small') return 'md:gap-3'
  if (store.settings.iconSize === 'large') return 'md:gap-5 lg:gap-6'
  return ''
})

const desktopMenuItems = computed(() => [
  { key: 'refresh', label: '刷新' },
  { key: 'divider-1', type: 'divider' },
  { key: 'wallpaper', label: '切换动态背景' },
])

const panelQuickApps = computed(() => {
  const preferred = ['github', 'bilibili', 'blog', 'tools', 'wiki', 'vault']
  const preferredApps = preferred
    .map(id => store.desktopApps.find(app => app.id === id))
    .filter(Boolean)

  if (preferredApps.length >= 5) {
    return preferredApps.slice(0, 5)
  }

  const fallback = store.desktopApps.filter(app => app.url && app.id !== 'terminal' && app.id !== 'settings')
  return fallback.slice(0, 5)
})

const onlineServiceApps = computed(() => {
  return store.apps.filter(app => app.url && app.status === 'online')
})

const offlineServiceApps = computed(() => {
  return store.apps.filter(app => app.url && app.status === 'offline')
})

const availabilityRate = computed(() => {
  const { total, online } = store.serviceSummary
  if (!total) return 0
  return Math.round((online / total) * 100)
})

const lastCheckLabel = computed(() => {
  if (!store.lastStatusCheckAt) return '--:--:--'
  return new Date(store.lastStatusCheckAt).toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
})

const activePresetLabel = computed(() => {
  const names = {
    'deep-net': '深网',
    'neon-core': '霓虹',
    'quantum-green': '量子',
    'signal-amber': '信号',
  }
  return names[activePreset.value.id] || activePreset.value.id
})

const motionLevelLabel = computed(() => {
  const names = { low: '低', medium: '中', high: '高' }
  return names[store.settings.motionLevel] || '中'
})

const bootStatusText = computed(() => {
  if (bootProgress.value < 35) return '连接核心模块中...'
  if (bootProgress.value < 70) return '载入桌面组件中...'
  if (bootProgress.value < 95) return '同步工作区状态...'
  return '准备就绪'
})

let timeInterval = null

const clearBootProgressTimer = () => {
  if (!bootProgressTimer) return
  clearInterval(bootProgressTimer)
  bootProgressTimer = null
}

const clearBootFinishTimer = () => {
  if (!bootFinishTimer) return
  clearTimeout(bootFinishTimer)
  bootFinishTimer = null
}

const clearBootSequenceTimers = () => {
  clearBootProgressTimer()
  clearBootFinishTimer()
}

const hasSeenBootSequence = () => {
  if (typeof window === 'undefined') return true

  try {
    return window.localStorage.getItem(BOOT_SEEN_STORAGE_KEY) === '1'
  } catch (error) {
    console.warn('读取开机动画状态失败', error)
    return false
  }
}

const markBootSequenceSeen = () => {
  if (typeof window === 'undefined') return

  try {
    window.localStorage.setItem(BOOT_SEEN_STORAGE_KEY, '1')
  } catch (error) {
    console.warn('保存开机动画状态失败', error)
  }
}

const startBootSequence = () => {
  clearBootSequenceTimers()

  const reducedMotion = typeof window !== 'undefined'
    && window.matchMedia
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches

  const duration = reducedMotion ? 450 : 1900
  const stepMs = 60
  const step = Math.max(1, Math.ceil((100 * stepMs) / duration))

  showBootSequence.value = true
  bootProgress.value = 0

  bootProgressTimer = setInterval(() => {
    bootProgress.value = Math.min(100, bootProgress.value + step)
    if (bootProgress.value >= 100) clearBootProgressTimer()
  }, stepMs)

  bootFinishTimer = setTimeout(() => {
    showBootSequence.value = false
    markBootSequenceSeen()
    clearBootFinishTimer()
  }, duration + 140)
}

const updateTime = () => {
  const now = new Date()
  currentTime.value = now.toLocaleTimeString('zh-CN', { 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: false 
  })
}

onMounted(() => {
  if (!hasSeenBootSequence()) {
    startBootSequence()
  } else {
    showBootSequence.value = false
    bootProgress.value = 100
  }

  store.loadPortalState()
  if (!wallpaperPresets.some(item => item.id === store.settings.wallpaper)) {
    store.setWallpaper(defaultPresetId)
  }
  if (store.settings.autoStartMonitoring) {
    store.startStatusMonitoring(store.settings.statusMonitorIntervalMs)
  }
  updateTime()
  timeInterval = setInterval(updateTime, 1000)

  if (typeof window !== 'undefined' && window.matchMedia) {
    reducedMotionMedia = window.matchMedia('(prefers-reduced-motion: reduce)')
    prefersReducedMotion.value = reducedMotionMedia.matches
    reducedMotionMedia.addEventListener('change', handleReducedMotionChange)
  }

  if (typeof document !== 'undefined') {
    isPageVisible.value = document.visibilityState !== 'hidden'
    document.addEventListener('visibilitychange', handleVisibilityChange)
  }

  window.addEventListener('keydown', handleGlobalKeydown)
  window.addEventListener(ICON_MENU_EVENT, hideContextMenu)
  document.addEventListener('pointerdown', handleStatusPanelOutside, true)
})

watch(
  () => launcherApps.value.length,
  (length) => {
    if (length === 0) {
      launcher.value.selectedIndex = 0
      return
    }

    if (launcher.value.selectedIndex >= length) {
      launcher.value.selectedIndex = 0
    }
  },
)

onUnmounted(() => {
  if (timeInterval) clearInterval(timeInterval)
  clearBootSequenceTimers()
  store.stopStatusMonitoring()

  if (reducedMotionMedia) {
    reducedMotionMedia.removeEventListener('change', handleReducedMotionChange)
    reducedMotionMedia = null
  }

  if (typeof document !== 'undefined') {
    document.removeEventListener('visibilitychange', handleVisibilityChange)
  }

  window.removeEventListener('keydown', handleGlobalKeydown)
  window.removeEventListener(ICON_MENU_EVENT, hideContextMenu)
  document.removeEventListener('pointerdown', handleStatusPanelOutside, true)
})

const handleReducedMotionChange = (event) => {
  prefersReducedMotion.value = event.matches
}

const handleVisibilityChange = () => {
  if (typeof document === 'undefined') return
  isPageVisible.value = document.visibilityState !== 'hidden'
}

const desktopStyle = computed(() => ({
  background: activePreset.value.background,
  '--cyber-grid-rgb': activePreset.value.gridRgb,
  '--cyber-scan-rgb': activePreset.value.scanRgb,
  '--cyber-glow-a-rgb': activePreset.value.glowARgb,
  '--cyber-glow-b-rgb': activePreset.value.glowBRgb,
  '--cyber-glow-c-rgb': activePreset.value.glowCRgb,
  '--cyber-beam-rgb': activePreset.value.beamRgb,
  '--cyber-node-rgb': activePreset.value.nodeRgb,
  '--cyber-code-rgb': activePreset.value.codeRgb,
  '--cyber-fx-opacity': motionProfile.value.opacity,
  '--cyber-fx-speed': motionProfile.value.speed,
  '--cyber-pointer-scale': motionProfile.value.pointer,
  '--cyber-fx-play-state': isPageVisible.value ? 'running' : 'paused',
}))

const wallpaperStyle = computed(() => {
  return {
    backgroundImage: activePreset.value.wallpaper,
    backgroundSize: '200% 200%',
    animation: 'wallpaper-drift 24s ease-in-out infinite',
    animationPlayState: isPageVisible.value ? 'running' : 'paused',
  }
})

const nodeStyle = (node) => ({
  top: node.top,
  left: node.left,
  width: `${node.size}px`,
  height: `${node.size}px`,
  animationDelay: node.delay,
  animationDuration: node.duration,
})

const pointerGlowStyle = computed(() => {
  const opacity = pointer.value.active ? 0.72 : 0.34
  return {
    '--pointer-x': `${pointer.value.x}%`,
    '--pointer-y': `${pointer.value.y}%`,
    opacity: opacity * motionProfile.value.pointer,
  }
})

const codeColumnStyle = (column) => ({
  left: column.left,
  animationDelay: column.delay,
  animationDuration: column.duration,
})

const bootParticleStyle = (particle) => ({
  top: particle.top,
  left: particle.left,
  width: `${particle.size}px`,
  height: `${particle.size}px`,
  animationDelay: particle.delay,
  animationDuration: particle.duration,
})

const handlePointerMove = (event) => {
  const target = event.currentTarget
  if (!target) return

  const rect = target.getBoundingClientRect()
  const x = ((event.clientX - rect.left) / rect.width) * 100
  const y = ((event.clientY - rect.top) / rect.height) * 100

  pointer.value = {
    x: Math.min(100, Math.max(0, x)),
    y: Math.min(100, Math.max(0, y)),
    active: true,
  }
}

const resetPointer = () => {
  pointer.value.active = false
}

const resetDragState = () => {
  dragState.value = { draggedId: null, targetId: null }
}

const handleIconDragStart = (appId) => {
  hideContextMenu()
  closeStatusPanel()
  dragState.value = {
    draggedId: appId,
    targetId: null,
  }
}

const handleIconDragEnter = (appId) => {
  if (!dragState.value.draggedId) return
  if (!appId || appId === dragState.value.draggedId) return
  dragState.value.targetId = appId
}

const handleIconDragOver = (appId) => {
  if (!dragState.value.draggedId) return
  if (!appId || appId === dragState.value.draggedId) return
  dragState.value.targetId = appId
}

const handleIconDragLeave = (appId) => {
  if (dragState.value.targetId !== appId) return
  dragState.value.targetId = null
}

const handleIconGridDragOver = (event) => {
  if (!dragState.value.draggedId) return
  const target = event.target
  if (!(target instanceof Element)) {
    dragState.value.targetId = null
    return
  }

  if (!target.closest('.app-icon')) {
    dragState.value.targetId = null
  }
}

const handleIconDrop = (appId) => {
  const fromAppId = dragState.value.draggedId
  if (!fromAppId) {
    resetDragState()
    return
  }

  if (appId && appId !== fromAppId) {
    store.reorderDesktopApps(fromAppId, appId)
  }

  resetDragState()
}

const handleIconGridDrop = () => {
  resetDragState()
}

const handleIconDragEnd = () => {
  resetDragState()
}

const handleGlobalKeydown = async (event) => {
  const isLauncherShortcut = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k'
  if (isLauncherShortcut) {
    event.preventDefault()
    if (launcher.value.open) {
      closeLauncher()
      return
    }
    await openLauncher()
    return
  }

  if (event.key === 'Escape' && launcher.value.open) {
    closeLauncher()
    return
  }

  if (event.key === 'Escape' && statusPanelOpen.value) {
    closeStatusPanel()
  }
}

const closeStatusPanel = () => {
  statusPanelOpen.value = false
}

const toggleStatusPanel = () => {
  statusPanelOpen.value = !statusPanelOpen.value
}

const handleStatusPanelOutside = (event) => {
  if (!statusPanelOpen.value) return
  const target = event.target
  if (!(target instanceof Element)) return
  if (statusPanelRef.value?.contains(target)) return
  if (statusButtonRef.value?.contains(target)) return
  closeStatusPanel()
}

const openLauncher = async () => {
  closeStatusPanel()
  launcher.value.open = true
  launcher.value.query = ''
  launcher.value.selectedIndex = 0
  await nextTick()
  launcherInput.value?.focus()
}

const closeLauncher = () => {
  launcher.value.open = false
}

const setSelectedIndex = (index) => {
  launcher.value.selectedIndex = index
}

const moveSelection = (direction) => {
  if (!launcherApps.value.length) return

  const next = launcher.value.selectedIndex + direction
  if (next < 0) {
    launcher.value.selectedIndex = launcherApps.value.length - 1
    return
  }

  launcher.value.selectedIndex = next % launcherApps.value.length
}

const openFromLauncher = (appId) => {
  store.openWindow(appId)
  closeLauncher()
}

const openWidgetApp = (appId) => {
  store.openWindow(appId)
}

const openStatusService = (appId) => {
  closeStatusPanel()
  store.openWindow(appId)
}

const launchSelected = () => {
  const selected = launcherApps.value[launcher.value.selectedIndex]
  if (!selected) return
  openFromLauncher(selected.id)
}

const isPinned = (appId) => store.pinnedAppIds.includes(appId)

const togglePinned = (appId) => {
  store.togglePinnedApp(appId)
}

const statusText = (status) => {
  if (status === 'online') return '在线'
  if (status === 'offline') return '离线'
  if (status === 'local') return '本地'
  return '未知'
}

const showContextMenu = (e) => {
  closeStatusPanel()
  window.dispatchEvent(new CustomEvent(DESKTOP_MENU_EVENT))
  contextMenu.value = {
    show: true,
    x: e.clientX,
    y: e.clientY,
  }
}

const handleDesktopMenuSelect = (key) => {
  if (key === 'refresh') {
    refreshDesktop()
    return
  }

  if (key === 'wallpaper') {
    changeWallpaper()
  }
}

const hideContextMenu = () => {
  contextMenu.value.show = false
}

const refreshDesktop = async () => {
  hideContextMenu()

  launcher.value.query = ''
  launcher.value.selectedIndex = 0
  closeLauncher()

  pointer.value.active = false

  await store.checkServiceStatuses()
}

const changeWallpaper = () => {
  hideContextMenu()
  const currentIndex = wallpaperPresets.findIndex(item => item.id === store.settings.wallpaper)
  const nextIndex = currentIndex < 0 ? 0 : (currentIndex + 1) % wallpaperPresets.length
  store.setWallpaper(wallpaperPresets[nextIndex].id)
}
</script>

<style scoped>
.desktop {
  user-select: none;
  --menu-frost: rgba(246, 248, 255, 0.26);
  --menu-border: rgba(255, 255, 255, 0.4);
  --menu-shadow: rgba(12, 18, 34, 0.32);
}

.boot-sequence {
  position: absolute;
  inset: 0;
  z-index: var(--z-boot-sequence, 220);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  pointer-events: all;
  background:
    radial-gradient(circle at 14% 16%, rgba(56, 189, 248, 0.22) 0%, rgba(56, 189, 248, 0) 34%),
    radial-gradient(circle at 80% 78%, rgba(14, 165, 233, 0.18) 0%, rgba(14, 165, 233, 0) 38%),
    linear-gradient(148deg, rgba(2, 8, 20, 0.98) 0%, rgba(6, 20, 43, 0.96) 48%, rgba(2, 12, 28, 0.98) 100%);
  backdrop-filter: blur(6px);
}

.boot-scan-layer {
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  background:
    linear-gradient(180deg, rgba(56, 189, 248, 0) 0%, rgba(56, 189, 248, 0.18) 48%, rgba(56, 189, 248, 0) 100%),
    repeating-linear-gradient(180deg, rgba(148, 163, 184, 0.06) 0 2px, rgba(2, 12, 28, 0) 2px 6px);
  background-size: 100% 240px, 100% 8px;
  background-position: 0 -260px, 0 0;
  opacity: 0.55;
  mix-blend-mode: screen;
  animation: boot-scan-shift 7.6s linear infinite;
}

.boot-noise-layer {
  position: absolute;
  inset: 0;
  z-index: 1;
  pointer-events: none;
  opacity: 0.2;
  mix-blend-mode: soft-light;
  background-image: radial-gradient(circle, rgba(186, 230, 253, 0.48) 0.7px, transparent 0.7px);
  background-size: 3px 3px;
  animation: boot-noise-shift 0.6s steps(2) infinite;
}

.boot-particle {
  position: absolute;
  z-index: 2;
  border-radius: 999px;
  pointer-events: none;
  background: rgba(186, 230, 253, 0.92);
  box-shadow:
    0 0 0 0 rgba(56, 189, 248, 0.42),
    0 0 12px rgba(56, 189, 248, 0.75);
  animation: boot-particle-pulse ease-in-out infinite;
}

.boot-core {
  position: relative;
  z-index: 3;
  width: min(460px, calc(100vw - 38px));
  padding: 22px 20px 18px;
  display: grid;
  justify-items: center;
  border: 1px solid rgba(125, 211, 252, 0.36);
  border-radius: 18px;
  background: linear-gradient(170deg, rgba(3, 15, 33, 0.74) 0%, rgba(5, 20, 43, 0.68) 100%);
  box-shadow:
    0 18px 42px rgba(2, 8, 23, 0.58),
    inset 0 1px 0 rgba(186, 230, 253, 0.16);
  animation: boot-core-enter 520ms ease-out;
}

.boot-orbit {
  position: relative;
  width: 118px;
  height: 118px;
  margin-bottom: 10px;
}

.boot-orbit-ring {
  position: absolute;
  inset: 0;
  border-radius: 999px;
  border: 1px solid rgba(125, 211, 252, 0.5);
  box-shadow: 0 0 32px rgba(56, 189, 248, 0.26);
  animation: boot-orbit-pulse 1.9s ease-in-out infinite;
}

.boot-logo {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 20px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-align: center;
  white-space: nowrap;
  color: rgba(224, 242, 254, 0.96);
  line-height: 1;
  text-shadow: 0 0 18px rgba(56, 189, 248, 0.46);
}

.boot-subtitle {
  margin-bottom: 16px;
  font-size: 12px;
  letter-spacing: 0.12em;
  color: rgba(191, 219, 254, 0.75);
}

.boot-progress-track {
  width: 100%;
  height: 8px;
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.56);
  border: 1px solid rgba(125, 211, 252, 0.26);
  overflow: hidden;
}

.boot-progress-fill {
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, rgba(34, 211, 238, 0.95) 0%, rgba(56, 189, 248, 0.98) 52%, rgba(14, 165, 233, 0.95) 100%);
  box-shadow: 0 0 16px rgba(56, 189, 248, 0.42);
  transition: width 120ms linear;
}

.boot-progress-text {
  margin-top: 10px;
  min-height: 18px;
  font-size: 11px;
  color: rgba(186, 230, 253, 0.92);
  letter-spacing: 0.06em;
  transition: opacity 200ms ease;
}

.boot-fade-enter-active,
.boot-fade-leave-active {
  transition: opacity 280ms ease;
}

.boot-fade-enter-from,
.boot-fade-leave-to {
  opacity: 0;
}

.boot-status-enter-active,
.boot-status-leave-active {
  transition: opacity 180ms ease;
}

.boot-status-enter-from,
.boot-status-leave-to {
  opacity: 0;
}

@keyframes boot-core-enter {
  0% {
    opacity: 0;
    transform: translate3d(0, 14px, 0) scale(0.98);
  }
  100% {
    opacity: 1;
    transform: translate3d(0, 0, 0) scale(1);
  }
}

@keyframes boot-orbit-pulse {
  0%,
  100% {
    transform: scale(1);
    opacity: 0.72;
  }
  50% {
    transform: scale(1.06);
    opacity: 1;
  }
}

@keyframes boot-scan-shift {
  0% {
    background-position: 0 -260px, 0 0;
  }
  100% {
    background-position: 0 120vh, 0 0;
  }
}

@keyframes boot-noise-shift {
  0% {
    transform: translate3d(0, 0, 0);
  }
  50% {
    transform: translate3d(-1px, 1px, 0);
  }
  100% {
    transform: translate3d(1px, -1px, 0);
  }
}

@keyframes boot-particle-pulse {
  0%,
  100% {
    transform: scale(1);
    opacity: 0.7;
    box-shadow:
      0 0 0 0 rgba(56, 189, 248, 0.42),
      0 0 12px rgba(56, 189, 248, 0.72);
  }
  55% {
    transform: scale(1.28);
    opacity: 1;
    box-shadow:
      0 0 0 10px rgba(56, 189, 248, 0),
      0 0 20px rgba(125, 211, 252, 0.88);
  }
}

.desktop-main-grid {
  display: grid;
  gap: 20px;
}

.desktop-workspace {
  min-height: calc(100% - 2.25rem);
}

.desktop-icons {
  align-content: start;
  justify-items: start;
  width: 100%;
}

@media (min-width: 1280px) {
  .desktop-main-grid {
    grid-template-columns: minmax(0, 1fr) 320px;
    align-items: start;
  }
}

.desktop-side-panel {
  position: sticky;
  top: 56px;
}

.widget-card {
  border-radius: 14px;
  border: 1px solid rgba(148, 163, 184, 0.26);
  background: linear-gradient(180deg, rgba(6, 20, 40, 0.58) 0%, rgba(5, 16, 29, 0.68) 100%);
  backdrop-filter: blur(14px);
  padding: 12px;
  color: rgb(226 232 240);
}

.widget-title {
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.04em;
  margin-bottom: 8px;
}

.widget-metric-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 12px;
  color: rgb(203 213 225);
  padding: 4px 0;
}

.widget-sub {
  font-size: 11px;
  color: rgb(148 163 184);
}

.widget-link {
  width: 100%;
  border-radius: 10px;
  border: 1px solid rgba(148, 163, 184, 0.24);
  background: rgba(15, 23, 42, 0.34);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 8px 10px;
  margin-bottom: 8px;
  text-align: left;
  font-size: 12px;
  color: rgb(226 232 240);
}

.widget-link:last-child {
  margin-bottom: 0;
}

.widget-link:hover {
  border-color: rgba(56, 189, 248, 0.52);
  background: rgba(14, 116, 144, 0.28);
}

.widget-link-left {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.widget-link-domain {
  max-width: 118px;
  font-size: 10px;
  color: rgb(148 163 184);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.tech-grid-layer {
  pointer-events: none;
  background-image:
    linear-gradient(rgba(var(--cyber-grid-rgb), 0.15) 1px, transparent 1px),
    linear-gradient(90deg, rgba(var(--cyber-grid-rgb), 0.15) 1px, transparent 1px),
    radial-gradient(circle at 50% 50%, rgba(var(--cyber-grid-rgb), 0.22) 0%, rgba(var(--cyber-grid-rgb), 0) 62%);
  background-size: 52px 52px, 52px 52px, 100% 100%;
  background-position: 0 0, 0 0, center;
  mask-image: linear-gradient(to bottom, rgba(0, 0, 0, 0.78) 0%, rgba(0, 0, 0, 0.28) 100%);
  animation: tech-grid-shift calc(22s * var(--cyber-fx-speed, 1)) linear infinite;
  animation-play-state: var(--cyber-fx-play-state, running);
  opacity: calc(0.5 * var(--cyber-fx-opacity, 1));
}

.tech-scan-layer {
  pointer-events: none;
  background:
    linear-gradient(180deg, rgba(var(--cyber-grid-rgb), 0) 0%, rgba(var(--cyber-grid-rgb), 0.15) 46%, rgba(var(--cyber-grid-rgb), 0) 100%),
    repeating-linear-gradient(180deg, rgba(var(--cyber-scan-rgb), 0.08) 0 2px, rgba(5, 16, 29, 0) 2px 6px);
  background-size: 100% 240px, 100% 8px;
  background-position: 0 -260px, 0 0;
  mix-blend-mode: screen;
  opacity: calc(0.55 * var(--cyber-fx-opacity, 1));
  animation: tech-scan-move calc(11s * var(--cyber-fx-speed, 1)) linear infinite;
  animation-play-state: var(--cyber-fx-play-state, running);
}

.tech-glow-layer {
  pointer-events: none;
  background:
    radial-gradient(circle at 12% 18%, rgba(var(--cyber-glow-a-rgb), 0.14) 0%, rgba(var(--cyber-glow-a-rgb), 0) 34%),
    radial-gradient(circle at 78% 78%, rgba(var(--cyber-glow-c-rgb), 0.16) 0%, rgba(var(--cyber-glow-c-rgb), 0) 36%),
    radial-gradient(circle at 54% 44%, rgba(var(--cyber-glow-b-rgb), 0.12) 0%, rgba(var(--cyber-glow-b-rgb), 0) 42%);
  animation: tech-glow-pan calc(18s * var(--cyber-fx-speed, 1)) ease-in-out infinite;
  animation-play-state: var(--cyber-fx-play-state, running);
}

.tech-node {
  position: absolute;
  z-index: 4;
  border-radius: 999px;
  pointer-events: none;
  background: rgba(var(--cyber-node-rgb), 0.95);
  box-shadow:
    0 0 0 0 rgba(var(--cyber-beam-rgb), 0.48),
    0 0 18px rgba(var(--cyber-beam-rgb), 0.7);
  animation: tech-node-pulse calc(4.2s * var(--cyber-fx-speed, 1)) ease-out infinite;
  animation-play-state: var(--cyber-fx-play-state, running);
}

.tech-beam {
  position: absolute;
  z-index: 5;
  width: 30vmax;
  height: 30vmax;
  border-radius: 999px;
  pointer-events: none;
  filter: blur(18px);
  mix-blend-mode: screen;
  background: conic-gradient(from 160deg, rgba(var(--cyber-beam-rgb), 0) 0deg, rgba(var(--cyber-beam-rgb), 0.26) 36deg, rgba(var(--cyber-beam-rgb), 0) 96deg);
}

.cyber-pointer-glow {
  position: absolute;
  inset: -14%;
  z-index: 6;
  pointer-events: none;
  background:
    radial-gradient(circle at var(--pointer-x) var(--pointer-y), rgba(var(--cyber-glow-a-rgb), 0.26) 0%, rgba(var(--cyber-glow-a-rgb), 0.07) 12%, rgba(var(--cyber-glow-a-rgb), 0) 30%),
    radial-gradient(circle at calc(var(--pointer-x) + 6%) calc(var(--pointer-y) + 4%), rgba(var(--cyber-glow-b-rgb), 0.16) 0%, rgba(var(--cyber-glow-b-rgb), 0) 24%);
  filter: blur(3px);
  transform: scale(var(--cyber-pointer-scale, 1));
  transition: opacity 300ms ease;
}

.cyber-noise-layer {
  position: absolute;
  inset: 0;
  z-index: 7;
  pointer-events: none;
  opacity: calc(0.22 * var(--cyber-fx-opacity, 1));
  mix-blend-mode: soft-light;
  background-image: radial-gradient(circle, rgba(var(--cyber-node-rgb), 0.4) 0.7px, transparent 0.7px);
  background-size: 3px 3px;
  animation: cyber-noise-shift calc(0.55s * var(--cyber-fx-speed, 1)) steps(2) infinite;
  animation-play-state: var(--cyber-fx-play-state, running);
}

.cyber-code-rain {
  position: absolute;
  inset: 0;
  z-index: 8;
  pointer-events: none;
  overflow: hidden;
  opacity: calc(0.56 * var(--cyber-fx-opacity, 1));
}

.code-column {
  position: absolute;
  top: -30%;
  width: 136px;
  color: rgba(var(--cyber-code-rgb), 0.66);
  font-size: 10px;
  letter-spacing: 0.08em;
  writing-mode: vertical-rl;
  text-orientation: mixed;
  text-shadow:
    0 0 8px rgba(var(--cyber-beam-rgb), 0.55),
    0 0 20px rgba(var(--cyber-glow-a-rgb), 0.36);
  animation: cyber-code-fall linear infinite;
  animation-play-state: var(--cyber-fx-play-state, running);
}

.beam-a {
  top: -32%;
  left: -10%;
  animation: tech-beam-drift-a calc(17s * var(--cyber-fx-speed, 1)) ease-in-out infinite;
  animation-play-state: var(--cyber-fx-play-state, running);
}

.beam-b {
  right: -14%;
  bottom: -34%;
  animation: tech-beam-drift-b calc(20s * var(--cyber-fx-speed, 1)) ease-in-out infinite;
  animation-play-state: var(--cyber-fx-play-state, running);
}

.menu-bar {
  height: 2.25rem;
  border-bottom: 1px solid var(--menu-border);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.24) 0%, rgba(236, 242, 255, 0.12) 100%),
    var(--menu-frost);
  backdrop-filter: saturate(150%) blur(20px);
  -webkit-backdrop-filter: saturate(150%) blur(20px);
  box-shadow:
    0 1px 0 rgba(255, 255, 255, 0.44) inset,
    0 8px 22px -14px var(--menu-shadow);
}

.menu-brand-group {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-width: 0;
}

.menu-apple {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.25rem;
  height: 1.25rem;
  font-size: 0.95rem;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.2);
  box-shadow: 0 1px 0 rgba(255, 255, 255, 0.44) inset;
}

.menu-title {
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.02em;
  color: rgb(248 250 252);
  text-shadow: 0 1px 2px rgba(15, 23, 42, 0.32);
}

.menu-divider {
  width: 1px;
  height: 0.85rem;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.42);
  margin: 0 0.3rem;
}

.menu-nav {
  align-items: center;
  gap: 0.15rem;
}

.menu-nav-item {
  padding: 0.2rem 0.48rem;
  border-radius: 0.42rem;
  font-size: 12px;
  color: rgba(248, 250, 252, 0.9);
  transition: background 140ms ease;
}

.menu-nav-item:hover {
  background: rgba(255, 255, 255, 0.2);
}

.menu-right-group {
  display: flex;
  align-items: center;
  gap: 0.55rem;
}

.menu-action-btn,
.menu-shortcut-btn {
  height: 1.6rem;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.3);
  padding: 0 0.72rem;
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.02em;
  color: rgb(248 250 252);
  transition: all 160ms ease;
}

.menu-utility-btn {
  min-width: 3.65rem;
}

.menu-action-btn {
  background: rgba(255, 255, 255, 0.2);
}

.menu-shortcut-btn {
  background: rgba(15, 23, 42, 0.28);
}

.menu-action-btn:hover,
.menu-shortcut-btn:hover {
  transform: translateY(-1px);
  border-color: rgba(255, 255, 255, 0.44);
  background: rgba(255, 255, 255, 0.3);
}

.menu-clock {
  min-width: 48px;
  text-align: right;
  font-size: 13px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.03em;
  color: rgb(248 250 252);
  text-shadow: 0 1px 2px rgba(15, 23, 42, 0.35);
}

.menu-chip-cluster {
  border: 1px solid rgba(255, 255, 255, 0.24);
  background: rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(7px);
}

.status-pill {
  border: 1px solid rgba(255, 255, 255, 0.28);
  border-radius: 999px;
  padding: 2px 9px;
  backdrop-filter: blur(8px);
}

.status-trigger {
  border-radius: 999px;
  padding: 3px 7px;
}

.status-trigger:hover {
  background: rgba(255, 255, 255, 0.08);
}

.status-panel {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  width: min(560px, calc(100vw - 34px));
  border-radius: 14px;
  border: 1px solid rgba(255, 255, 255, 0.24);
  padding: 12px;
  color: rgb(226 232 240);
  box-shadow: 0 20px 46px rgba(2, 8, 23, 0.5);
}

.status-panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
  font-size: 12px;
  font-weight: 700;
}

.status-panel-time {
  font-size: 11px;
  color: rgb(148 163 184);
}

.status-panel-grid {
  display: grid;
  gap: 10px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.status-panel-title {
  margin-bottom: 6px;
  font-size: 11px;
  font-weight: 700;
}

.status-panel-list {
  display: grid;
  gap: 6px;
}

.status-app-row {
  border-radius: 9px;
  border: 1px solid rgba(148, 163, 184, 0.3);
  background: rgba(15, 23, 42, 0.38);
  padding: 6px 8px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  font-size: 12px;
}

.status-app-row-button {
  width: 100%;
  text-align: left;
  transition: all 140ms ease;
}

.status-app-row-button:hover {
  border-color: rgba(56, 189, 248, 0.52);
  background: rgba(14, 116, 144, 0.24);
}

.status-app-domain {
  max-width: 180px;
  font-size: 10px;
  color: rgb(148 163 184);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.status-empty {
  border-radius: 9px;
  border: 1px dashed rgba(148, 163, 184, 0.36);
  padding: 8px;
  font-size: 11px;
  color: rgb(148 163 184);
}

.launcher-overlay {
  position: fixed;
  inset: 0;
  z-index: var(--z-launcher-overlay, 70);
  background: rgba(1, 6, 16, 0.58);
  backdrop-filter: blur(10px) saturate(120%);
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: 14vh;
}

.launcher-panel {
  width: min(680px, calc(100vw - 28px));
  border-radius: 18px;
  overflow: hidden;
  border: 1px solid rgba(148, 163, 184, 0.28);
  box-shadow: 0 20px 60px rgba(2, 6, 23, 0.62);
}

.launcher-input {
  width: 100%;
  border: 0;
  outline: none;
  padding: 16px 18px;
  background: rgba(2, 6, 23, 0.82);
  color: rgb(226, 232, 240);
  font-size: 15px;
}

.launcher-input::placeholder {
  color: rgba(148, 163, 184, 0.9);
}

.launcher-list {
  max-height: 52vh;
  overflow: auto;
  padding: 10px;
  display: grid;
  gap: 8px;
}

.launcher-quick-zones {
  display: grid;
  gap: 8px;
  padding: 10px 10px 0;
}

.launcher-quick-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.launcher-quick-label {
  font-size: 11px;
  color: rgba(148, 163, 184, 0.9);
  min-width: 28px;
}

.launcher-chip {
  border: 1px solid rgba(56, 189, 248, 0.35);
  background: rgba(14, 116, 144, 0.32);
  color: rgb(224, 242, 254);
  border-radius: 999px;
  font-size: 12px;
  padding: 3px 10px;
}

.launcher-chip:hover {
  background: rgba(14, 116, 144, 0.5);
}

.launcher-chip-muted {
  border-color: rgba(148, 163, 184, 0.3);
  background: rgba(30, 41, 59, 0.66);
  color: rgb(226, 232, 240);
}

.launcher-item {
  width: 100%;
  border: 1px solid rgba(148, 163, 184, 0.24);
  background: rgba(15, 23, 42, 0.74);
  border-radius: 12px;
  padding: 10px 12px;
  display: grid;
  grid-template-columns: 26px 1fr auto;
  align-items: center;
  gap: 10px;
  text-align: left;
  color: rgb(226, 232, 240);
}

.launcher-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.pin-toggle {
  width: 22px;
  height: 22px;
  border-radius: 999px;
  border: 1px solid rgba(148, 163, 184, 0.35);
  background: rgba(30, 41, 59, 0.82);
  color: rgba(148, 163, 184, 0.95);
  font-size: 12px;
  line-height: 1;
}

.pin-toggle:hover {
  border-color: rgba(250, 204, 21, 0.7);
  color: rgba(161, 98, 7, 0.95);
}

.pin-toggle.is-pinned {
  background: rgba(254, 240, 138, 0.62);
  border-color: rgba(250, 204, 21, 0.85);
  color: rgba(161, 98, 7, 0.98);
}

.launcher-item:hover,
.launcher-item.is-active {
  background: rgba(15, 23, 42, 0.9);
  border-color: rgba(56, 189, 248, 0.55);
}

.launcher-status {
  font-size: 11px;
  border-radius: 999px;
  padding: 2px 7px;
}

.status-online {
  background: rgba(16, 185, 129, 0.2);
  color: rgb(167, 243, 208);
}

.status-offline {
  background: rgba(244, 63, 94, 0.2);
  color: rgb(254, 205, 211);
}

.status-local {
  background: rgba(100, 116, 139, 0.2);
  color: rgb(203, 213, 225);
}

@keyframes wallpaper-drift {
  0%,
  100% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
}

@keyframes tech-grid-shift {
  0% {
    background-position: 0 0, 0 0, center;
  }
  100% {
    background-position: 104px 52px, 104px 52px, center;
  }
}

@keyframes tech-scan-move {
  0% {
    background-position: 0 -260px, 0 0;
  }
  100% {
    background-position: 0 120vh, 0 0;
  }
}

@keyframes tech-node-pulse {
  0%,
  100% {
    transform: scale(1);
    box-shadow:
      0 0 0 0 rgba(var(--cyber-beam-rgb), 0.46),
      0 0 18px rgba(var(--cyber-beam-rgb), 0.7);
  }
  60% {
    transform: scale(1.3);
    box-shadow:
      0 0 0 12px rgba(var(--cyber-beam-rgb), 0),
      0 0 28px rgba(var(--cyber-code-rgb), 0.95);
  }
}

@keyframes tech-beam-drift-a {
  0%,
  100% {
    transform: translate3d(-8%, -5%, 0) rotate(0deg);
  }
  50% {
    transform: translate3d(14%, 12%, 0) rotate(18deg);
  }
}

@keyframes tech-beam-drift-b {
  0%,
  100% {
    transform: translate3d(6%, 4%, 0) rotate(0deg);
  }
  50% {
    transform: translate3d(-15%, -10%, 0) rotate(-22deg);
  }
}

@keyframes tech-glow-pan {
  0%,
  100% {
    transform: translate3d(0, 0, 0) scale(1);
  }
  50% {
    transform: translate3d(0, -2%, 0) scale(1.03);
  }
}

@keyframes cyber-code-fall {
  0% {
    transform: translate3d(0, -20%, 0);
    opacity: 0;
  }
  12% {
    opacity: 0.75;
  }
  85% {
    opacity: 0.62;
  }
  100% {
    transform: translate3d(0, 135vh, 0);
    opacity: 0;
  }
}

@keyframes cyber-noise-shift {
  0% {
    transform: translate3d(0, 0, 0);
  }
  50% {
    transform: translate3d(-1px, 1px, 0);
  }
  100% {
    transform: translate3d(1px, -1px, 0);
  }
}

@media (max-width: 640px) {
  .menu-bar {
    padding-left: 0.65rem;
    padding-right: 0.65rem;
  }

  .menu-brand-group {
    gap: 0.42rem;
  }

  .menu-title {
    font-size: 12px;
  }

  .menu-right-group {
    gap: 0.45rem;
  }

  .menu-action-btn,
  .menu-shortcut-btn {
    padding: 0 0.58rem;
  }

  .desktop-workspace {
    padding-top: 3.45rem;
    padding-bottom: 7.75rem;
  }

  .boot-core {
    width: min(390px, calc(100vw - 28px));
  }

  .boot-particle {
    display: none;
  }

  .desktop-icons {
    justify-items: center;
    max-width: 100%;
  }

  .tech-grid-layer {
    background-size: 38px 38px, 38px 38px, 100% 100%;
  }

  .tech-beam {
    width: 42vmax;
    height: 42vmax;
    opacity: 0.62;
  }

  .cyber-code-rain {
    opacity: 0.36;
  }

  .code-column {
    font-size: 8px;
    width: 126px;
  }

  .cyber-pointer-glow {
    display: none;
  }

  .status-panel {
    width: min(420px, calc(100vw - 22px));
    right: -8px;
    padding: 10px;
  }

  .status-panel-grid {
    grid-template-columns: 1fr;
  }
}
</style>
