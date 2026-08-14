<template>
  <div 
    class="desktop w-full h-full relative overflow-hidden"
    :style="desktopStyle"
    @contextmenu.prevent="showContextMenu"
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
            <div class="boot-logo">GMLHUB</div>
          </div>
          <div class="boot-subtitle">工作区正在准备</div>
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
    <div class="desktop-wallpaper-layer absolute inset-0 z-0" :style="wallpaperStyle" />
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
    <div class="cyber-noise-layer" />
    <div v-if="store.settings.codeRainEnabled" class="liquid-ambient-layer" aria-hidden="true">
      <span class="liquid-ambient-blob liquid-ambient-blob-a" />
      <span class="liquid-ambient-blob liquid-ambient-blob-b" />
    </div>
    <div class="desktop-light-overlay absolute inset-0 z-[8] pointer-events-none" />
    <div class="ambient-wave wave-a bg-[radial-gradient(circle,rgba(56,189,248,0.12)_0%,rgba(56,189,248,0)_68%)]" />
    <div class="ambient-wave wave-b bg-[radial-gradient(circle,rgba(125,211,252,0.12)_0%,rgba(125,211,252,0)_68%)]" />
    <div class="ambient-orb w-72 h-72 -top-36 -left-32 bg-cyan-200/14" />
    <div class="ambient-orb w-96 h-96 bottom-[-140px] right-[-90px] bg-sky-300/18" />
    
    <!-- 顶部菜单栏 -->
    <div class="menu-bar fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-3 md:px-5">
      <div class="menu-brand-group">
        <span class="menu-brandmark" aria-hidden="true"><span>G</span></span>
        <span class="menu-brand-copy">
          <span class="menu-title">GMLHUB</span>
          <span class="menu-subtitle">PERSONAL DESKTOP</span>
        </span>
        <span class="menu-divider hidden md:block" />
        <div class="menu-nav hidden xl:flex" aria-label="桌面导航">
          <button type="button" class="menu-nav-item" @click="focusWorkspace">工作区</button>
          <button type="button" class="menu-nav-item" @click="toggleStatusPanel">服务</button>
          <button type="button" class="menu-nav-item" @click="openSystemSettings">系统</button>
        </div>
      </div>
      <div class="menu-right-group relative">
        <div class="hidden lg:block">
          <button
            ref="statusButtonRef"
            class="status-trigger menu-chip-cluster flex items-center gap-1.5 text-[11px]"
            type="button"
            :aria-expanded="statusPanelOpen"
            aria-controls="service-status-panel"
            @click.stop="toggleStatusPanel"
          >
          <span class="status-live-dot" :class="{ 'is-checking': store.isMonitoringStatus }" />
          <span class="status-pill status-pill-reachable">可访问 {{ store.serviceSummary.reachable }}</span>
          <span class="status-pill status-pill-unreachable">不可达 {{ store.serviceSummary.unreachable }}</span>
          <span class="status-pill status-pill-unknown">待检查 {{ store.serviceSummary.unknown }}</span>
          <span v-if="store.isMonitoringStatus" class="status-pill status-pill-checking">检测中</span>
          </button>

          <div v-if="statusPanelOpen" id="service-status-panel" ref="statusPanelRef" class="status-panel glass-strong">
            <div class="status-panel-head">
              <span>服务状态</span>
              <span class="status-panel-time">{{ lastCheckLabel }}</span>
            </div>

            <div class="status-panel-grid">
              <section>
                <p class="status-panel-title text-emerald-200">可访问服务 ({{ reachableServiceApps.length }})</p>
                <div v-if="reachableServiceApps.length" class="status-panel-list">
                  <button
                    v-for="app in reachableServiceApps"
                    :key="`reachable-${app.id}`"
                    type="button"
                    class="status-app-row status-app-row-button"
                    @click="openStatusService(app.id)"
                  >
                    <span>{{ app.name }}</span>
                    <span class="status-app-domain">{{ app.domain }}</span>
                  </button>
                </div>
                <p v-else class="status-empty">暂无可访问服务</p>
              </section>

              <section>
                <p class="status-panel-title text-rose-200">不可达服务 ({{ unreachableServiceApps.length }})</p>
                <div v-if="unreachableServiceApps.length" class="status-panel-list">
                  <button
                    v-for="app in unreachableServiceApps"
                    :key="`unreachable-${app.id}`"
                    type="button"
                    class="status-app-row status-app-row-button"
                    @click="openStatusService(app.id)"
                  >
                    <span>{{ app.name }}</span>
                    <span class="status-app-domain">{{ app.domain }}</span>
                  </button>
                </div>
                <p v-else class="status-empty">暂无不可达服务</p>
              </section>

              <section>
                <p class="status-panel-title text-hud-text/90">待检查服务 ({{ unknownServiceApps.length }})</p>
                <div v-if="unknownServiceApps.length" class="status-panel-list">
                  <button
                    v-for="app in unknownServiceApps"
                    :key="`unknown-${app.id}`"
                    type="button"
                    class="status-app-row status-app-row-button"
                    @click="openStatusService(app.id)"
                  >
                    <span>{{ app.name }}</span>
                    <span class="status-app-domain">{{ app.domain }}</span>
                  </button>
                </div>
                <p v-else class="status-empty">暂无待检查服务</p>
              </section>
            </div>
          </div>
        </div>
        <div class="appearance-control">
          <button
            ref="appearanceButtonRef"
            type="button"
            class="menu-action-btn menu-utility-btn"
            aria-label="打开外观设置"
            :aria-expanded="appearancePanelOpen"
            aria-controls="appearance-panel"
            @click.stop="toggleAppearancePanel"
          >
            外观
          </button>
          <div
            v-if="appearancePanelOpen"
            id="appearance-panel"
            ref="appearancePanelRef"
            class="appearance-panel glass-strong"
          >
            <div class="appearance-panel-head">
              <span>外观</span>
              <span>浅色工作台</span>
            </div>
            <div class="appearance-options">
              <button
                v-for="item in wallpaperPresets"
                :key="`appearance-${item.id}`"
                type="button"
                class="appearance-option"
                :class="{ active: store.settings.wallpaper === item.id }"
                @click="selectWallpaper(item.id)"
              >
                <span class="appearance-swatch" :style="{ background: item.wallpaper }" />
                <span>{{ wallpaperLabels[item.id] || item.id }}</span>
                <span v-if="store.settings.wallpaper === item.id" class="appearance-check">✓</span>
              </button>
            </div>
            <button
              type="button"
              class="appearance-setting"
              @click="store.setCodeRainEnabled(!store.settings.codeRainEnabled)"
            >
              <span>背景光影</span>
              <span>{{ store.settings.codeRainEnabled ? '开启' : '关闭' }}</span>
            </button>
            <button
              type="button"
              class="appearance-setting"
              @click="store.setShowServiceReadout(!store.settings.showServiceReadout)"
            >
              <span>服务摘要</span>
              <span>{{ store.settings.showServiceReadout ? '显示' : '隐藏' }}</span>
            </button>
          </div>
        </div>
        <button
          type="button"
          class="menu-shortcut-btn menu-utility-btn"
          aria-label="打开应用启动器，快捷键 Ctrl+K"
          @click="openLauncher"
        >
          Ctrl+K
        </button>
        <span class="menu-clock">{{ currentTime }}</span>
      </div>
    </div>

    <div v-if="launcher.open" class="launcher-overlay" @click="closeLauncher">
      <div class="launcher-panel glass-strong" @click.stop>
        <div class="launcher-kicker">
          <span class="launcher-kicker-mark"><IconGlyph name="search" :size="14" /></span>
          <span>COMMAND PALETTE</span>
          <kbd>ESC</kbd>
        </div>
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
              type="button"
              class="launcher-chip"
              @click="openFromLauncher(app.id)"
            >
              <IconGlyph :name="app.id" :size="14" />
              <span>{{ app.name }}</span>
            </button>
          </div>
          <div v-if="store.recentApps.length" class="launcher-quick-row">
            <span class="launcher-quick-label">最近</span>
            <button
              v-for="app in store.recentApps"
              :key="`recent-${app.id}`"
              type="button"
              class="launcher-chip launcher-chip-muted"
              @click="openFromLauncher(app.id)"
            >
              <IconGlyph :name="app.id" :size="14" />
              <span>{{ app.name }}</span>
            </button>
          </div>
        </div>
        <div class="launcher-list">
          <div
            v-for="(app, idx) in launcherApps"
            :key="app.id"
            class="launcher-item"
            :class="{ 'is-active': idx === launcher.selectedIndex }"
            role="button"
            tabindex="0"
            :aria-label="`打开 ${app.name}`"
            @click="openFromLauncher(app.id)"
            @mousemove="setSelectedIndex(idx)"
            @keydown.enter.prevent="openFromLauncher(app.id)"
            @keydown.space.prevent="openFromLauncher(app.id)"
          >
            <span class="launcher-item-icon"><IconGlyph :name="app.id" :size="18" /></span>
            <span class="flex flex-col items-start min-w-0">
              <span class="font-medium truncate max-w-full">{{ app.name }}</span>
                <span class="text-xs text-hud-muted truncate max-w-full">{{ app.domain || app.description }}</span>
            </span>
            <span class="launcher-actions">
              <button
                type="button"
                class="pin-toggle"
                :class="{ 'is-pinned': isPinned(app.id) }"
                @click.stop="togglePinned(app.id)"
              >
                ★
              </button>
              <span class="launcher-status" :class="`status-${app.status || 'local'}`">{{ statusText(app.status) }}</span>
            </span>
          </div>
          <div v-if="!launcherApps.length" class="px-4 py-6 text-center text-sm text-hud-muted">
            没找到匹配应用
          </div>
        </div>
      </div>
    </div>
    
    <div class="desktop-workspace relative z-20 px-4 pb-32 md:pb-36 md:px-10">
      <section class="workspace-hero" aria-labelledby="workspace-heading">
        <div class="workspace-hero-copy">
          <span class="workspace-eyebrow"><span class="workspace-eyebrow-dot" /> GMLHUB · 今日工作台</span>
          <h1 id="workspace-heading">今天，轻松开始<span class="hero-accent">。</span></h1>
          <p>把常用服务和工具放在手边，让每一次打开都感觉自然。</p>
        </div>
        <div v-if="store.settings.showServiceReadout" class="workspace-hero-readout" aria-label="服务概览">
          <span class="readout-label">服务可用</span>
          <strong>{{ store.serviceSummary.reachable }}<small>/{{ store.serviceSummary.total }}</small></strong>
          <span class="readout-sub">项服务正常运行</span>
        </div>
      </section>
      <div class="desktop-main-grid">
        <div class="desktop-main-area">
          <section class="desktop-app-panel" aria-labelledby="app-panel-heading">
            <div class="desktop-app-panel-head">
              <div>
                <span class="desktop-panel-kicker">常用应用 · {{ store.desktopApps.length }}</span>
                <h2 id="app-panel-heading">你的应用</h2>
              </div>
              <span class="desktop-panel-hint">按住拖动排序</span>
            </div>
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
          </section>

          <section class="focus-stage" aria-labelledby="focus-stage-heading">
            <div class="focus-stage-head">
              <div>
                <span class="focus-stage-kicker">今日焦点</span>
                <h2 id="focus-stage-heading">
                  <span>给自己一点空间</span>
                  <span>专注当下</span>
                </h2>
              </div>
              <span class="focus-stage-status"><span class="focus-stage-status-dot" /> 安静模式</span>
            </div>
            <div class="focus-visual" aria-hidden="true">
              <div class="focus-glass-orb">
                <span class="focus-liquid-swell focus-liquid-swell-a" />
                <span class="focus-liquid-swell focus-liquid-swell-b" />
                <span class="focus-liquid-sheen" />
                <span class="focus-liquid-bubble focus-liquid-bubble-a" />
                <span class="focus-liquid-bubble focus-liquid-bubble-b" />
                <span class="focus-orb-highlight" />
                <span class="focus-orb-shade" />
              </div>
              <span class="focus-orb-glow focus-orb-glow-a" />
              <span class="focus-orb-glow focus-orb-glow-b" />
            </div>
            <div class="focus-stage-foot">
              <span>把注意力留给正在进行的事</span>
              <span class="focus-stage-foot-mark">✦</span>
            </div>
          </section>
        </div>

        <aside class="desktop-side-panel hidden xl:grid gap-3 content-start">
          <section class="widget-card">
            <h3 class="widget-title">系统概览</h3>
            <div class="widget-metric-row">
              <span>可用率</span>
              <strong>{{ availabilityRate }}%</strong>
            </div>
            <div class="widget-metric-row">
              <span>可访问</span>
              <strong class="text-emerald-300">{{ store.serviceSummary.reachable }}</strong>
            </div>
            <div class="widget-metric-row">
              <span>不可达</span>
              <strong class="text-rose-300">{{ store.serviceSummary.unreachable }}</strong>
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
                <span class="widget-link-icon"><IconGlyph :name="app.id" :size="15" /></span>
                <span>{{ app.name }}</span>
              </span>
              <span class="widget-link-domain">{{ app.domain }}</span>
            </button>
          </section>

          <section class="widget-card">
            <h3 class="widget-title">桌面状态</h3>
            <div class="widget-metric-row"><span>色彩主题</span><strong>{{ activePresetLabel }}</strong></div>
            <div class="widget-metric-row"><span>动效强度</span><strong>{{ motionLevelLabel }}</strong></div>
            <div class="widget-metric-row"><span>背景光影</span><strong>{{ store.settings.codeRainEnabled ? '开启' : '关闭' }}</strong></div>
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
import { gsap } from 'gsap'
import { useDesktopStore } from '../../stores/desktop.js'
import { getAppRoute } from '../../services/deepLinks.js'
import AppIcon from './AppIcon.vue'
import Window from './Window.vue'
import Dock from './Dock.vue'
import ContextMenu from './ContextMenu.vue'
import IconGlyph from './IconGlyph.vue'

const store = useDesktopStore()
const currentTime = ref('')
const contextMenu = ref({ show: false, x: 0, y: 0 })
const launcherInput = ref(null)
const launcher = ref({ open: false, query: '', selectedIndex: 0 })
const dragState = ref({ draggedId: null, targetId: null })
const statusPanelOpen = ref(false)
const statusPanelRef = ref(null)
const statusButtonRef = ref(null)
const appearancePanelOpen = ref(false)
const appearancePanelRef = ref(null)
const appearanceButtonRef = ref(null)
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
let desktopEntranceTimeline = null

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

const bootParticles = [
  { id: 'bp1', top: '16%', left: '12%', size: 8, delay: '0s', duration: '3.4s' },
  { id: 'bp2', top: '26%', left: '82%', size: 6, delay: '0.8s', duration: '4.2s' },
  { id: 'bp3', top: '38%', left: '22%', size: 10, delay: '1.2s', duration: '3.8s' },
  { id: 'bp4', top: '52%', left: '74%', size: 7, delay: '0.4s', duration: '4.1s' },
  { id: 'bp5', top: '66%', left: '15%', size: 9, delay: '1.6s', duration: '3.5s' },
  { id: 'bp6', top: '72%', left: '88%', size: 6, delay: '2s', duration: '4.4s' },
]

const wallpaperLabels = {
  'deep-net': '晨雾',
  'neon-core': '薄暮',
  'quantum-green': '薄荷',
  'signal-amber': '暖阳',
}

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

const reachableServiceApps = computed(() => {
  return store.apps.filter(app => app.url && app.status === 'reachable')
})

const unreachableServiceApps = computed(() => {
  return store.apps.filter(app => app.url && app.status === 'unreachable')
})

const unknownServiceApps = computed(() => {
  return store.apps.filter(app => app.url && app.status === 'unknown')
})

const availabilityRate = computed(() => {
  const { total, reachable } = store.serviceSummary
  if (!total) return 0
  return Math.round((reachable / total) * 100)
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
    'deep-net': '晨雾',
    'neon-core': '薄暮',
    'quantum-green': '薄荷',
    'signal-amber': '暖阳',
  }
  return names[activePreset.value.id] || activePreset.value.id
})

const motionLevelLabel = computed(() => {
  const names = { low: '低', medium: '中', high: '高' }
  return names[store.settings.motionLevel] || '中'
})

const bootStatusText = computed(() => {
  if (bootProgress.value < 35) return '准备你的空间...'
  if (bootProgress.value < 70) return '整理常用应用...'
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

const animateDesktopEntrance = () => {
  desktopEntranceTimeline?.kill()

  const targets = gsap.utils.toArray('.menu-bar, .desktop-workspace, .desktop-side-panel, .dock')
  if (!targets.length) return

  if (prefersReducedMotion.value) {
    gsap.set(targets, { clearProps: 'opacity,transform,filter' })
    return
  }

  desktopEntranceTimeline = gsap.timeline({ defaults: { ease: 'power3.out' } })
  desktopEntranceTimeline.fromTo('.menu-bar', { y: -18, opacity: 0 }, {
    y: 0,
    opacity: 1,
    duration: 0.72,
  })
  desktopEntranceTimeline.fromTo('.desktop-workspace', { y: 18, opacity: 0, filter: 'blur(6px)' }, {
    y: 0,
    opacity: 1,
    filter: 'blur(0px)',
    duration: 0.9,
  }, '-=0.42')
  desktopEntranceTimeline.fromTo('.desktop-side-panel', { x: 18, opacity: 0 }, {
    x: 0,
    opacity: 1,
    duration: 0.72,
  }, '-=0.62')
  desktopEntranceTimeline.fromTo('.dock', { y: 26, opacity: 0 }, {
    y: 0,
    opacity: 1,
    duration: 0.78,
  }, '-=0.48')
}

const hasSeenBootSequence = () => {
  if (typeof window === 'undefined') return true

  try {
    return window.localStorage.getItem(BOOT_SEEN_STORAGE_KEY) === '1'
  } catch (error) {
    return false
  }
}

const markBootSequenceSeen = () => {
  if (typeof window === 'undefined') return

  try {
    window.localStorage.setItem(BOOT_SEEN_STORAGE_KEY, '1')
  } catch (error) {
    // silent fail for non-critical boot state
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
    nextTick(animateDesktopEntrance)
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
  if (typeof document !== 'undefined') {
    isPageVisible.value = document.visibilityState !== 'hidden'
  }

  if (!hasSeenBootSequence()) {
    startBootSequence()
  } else {
    showBootSequence.value = false
    bootProgress.value = 100
  }

  store.loadPortalState()
  syncDeepLink()
  if (!wallpaperPresets.some(item => item.id === store.settings.wallpaper)) {
    store.setWallpaper(defaultPresetId)
  }
  if (store.settings.autoStartMonitoring && isPageVisible.value) {
    store.startStatusMonitoring(store.settings.statusMonitorIntervalMs)
  }
  nextTick(() => {
    if (hasSeenBootSequence()) animateDesktopEntrance()
  })
  updateTime()
  timeInterval = setInterval(updateTime, 1000)

  if (typeof window !== 'undefined' && window.matchMedia) {
    reducedMotionMedia = window.matchMedia('(prefers-reduced-motion: reduce)')
    prefersReducedMotion.value = reducedMotionMedia.matches
    reducedMotionMedia.addEventListener('change', handleReducedMotionChange)
  }

  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', handleVisibilityChange)
  }

  window.addEventListener('keydown', handleGlobalKeydown)
  window.addEventListener('resize', handleViewportResize)
  window.addEventListener('hashchange', syncDeepLink)
  window.addEventListener(ICON_MENU_EVENT, hideContextMenu)
  document.addEventListener('pointerdown', handleStatusPanelOutside, true)
  document.addEventListener('pointerdown', handleAppearancePanelOutside, true)
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
  desktopEntranceTimeline?.kill()
  desktopEntranceTimeline = null
  store.stopStatusMonitoring()

  if (reducedMotionMedia) {
    reducedMotionMedia.removeEventListener('change', handleReducedMotionChange)
    reducedMotionMedia = null
  }

  if (typeof document !== 'undefined') {
    document.removeEventListener('visibilitychange', handleVisibilityChange)
  }

  window.removeEventListener('keydown', handleGlobalKeydown)
  window.removeEventListener('resize', handleViewportResize)
  window.removeEventListener('hashchange', syncDeepLink)
  window.removeEventListener(ICON_MENU_EVENT, hideContextMenu)
  document.removeEventListener('pointerdown', handleStatusPanelOutside, true)
  document.removeEventListener('pointerdown', handleAppearancePanelOutside, true)
})

const handleReducedMotionChange = (event) => {
  prefersReducedMotion.value = event.matches
}

const handleVisibilityChange = () => {
  if (typeof document === 'undefined') return
  isPageVisible.value = document.visibilityState !== 'hidden'
  if (isPageVisible.value && store.settings.autoStartMonitoring) {
    store.startStatusMonitoring(store.settings.statusMonitorIntervalMs)
  } else {
    store.stopStatusMonitoring()
  }
}

const handleViewportResize = () => {
  store.resizeWindowsToViewport()
}

const syncDeepLink = () => {
  const appId = getAppRoute()
  if (appId) store.openProjectDetails(appId)
}

const desktopStyle = computed(() => ({
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

const bootParticleStyle = (particle) => ({
  top: particle.top,
  left: particle.left,
  width: `${particle.size}px`,
  height: `${particle.size}px`,
  animationDelay: particle.delay,
  animationDuration: particle.duration,
})

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
    return
  }

  if (event.key === 'Escape' && appearancePanelOpen.value) {
    closeAppearancePanel()
  }
}

const closeStatusPanel = () => {
  statusPanelOpen.value = false
}

const toggleStatusPanel = () => {
  appearancePanelOpen.value = false
  statusPanelOpen.value = !statusPanelOpen.value
}

const closeAppearancePanel = () => {
  appearancePanelOpen.value = false
}

const toggleAppearancePanel = () => {
  closeStatusPanel()
  appearancePanelOpen.value = !appearancePanelOpen.value
}

const handleAppearancePanelOutside = (event) => {
  if (!appearancePanelOpen.value) return
  const target = event.target
  if (!(target instanceof Element)) return
  if (appearancePanelRef.value?.contains(target)) return
  if (appearanceButtonRef.value?.contains(target)) return
  closeAppearancePanel()
}

const focusWorkspace = () => {
  closeStatusPanel()
  closeAppearancePanel()
  const workspace = document.querySelector('.desktop-workspace')
  if (!workspace) return
  workspace.scrollTo({
    top: 0,
    behavior: prefersReducedMotion.value ? 'auto' : 'smooth',
  })
}

const openSystemSettings = () => {
  closeStatusPanel()
  closeAppearancePanel()
  store.openWindow('settings')
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
  closeAppearancePanel()
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
  if (status === 'reachable') return '可访问'
  if (status === 'unreachable') return '不可达'
  if (status === 'unknown') return '待检查'
  if (status === 'local') return '本地'
  return '未知'
}

const showContextMenu = (e) => {
  closeStatusPanel()
  closeAppearancePanel()
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

  await store.checkServiceStatuses()
}

const changeWallpaper = () => {
  hideContextMenu()
  const currentIndex = wallpaperPresets.findIndex(item => item.id === store.settings.wallpaper)
  const nextIndex = currentIndex < 0 ? 0 : (currentIndex + 1) % wallpaperPresets.length
  store.setWallpaper(wallpaperPresets[nextIndex].id)
}

const selectWallpaper = (presetId) => {
  if (!presetId) return
  store.setWallpaper(presetId)
  closeAppearancePanel()
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

.status-reachable {
  background: rgba(16, 185, 129, 0.2);
  color: rgb(167, 243, 208);
}

.status-unreachable {
  background: rgba(244, 63, 94, 0.2);
  color: rgb(254, 205, 211);
}

.status-unknown {
  background: rgba(100, 116, 139, 0.2);
  color: rgb(226, 232, 240);
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

  .status-panel {
    width: min(420px, calc(100vw - 22px));
    right: -8px;
    padding: 10px;
  }

  .status-panel-grid {
    grid-template-columns: 1fr;
  }
}

/* Orbit control-room visual system */
.desktop {
  --hud-ink: #f2f7ff;
  --hud-muted: #8ea4be;
  --hud-subtle: #607893;
  --hud-cyan: #9ce7ff;
  --hud-cyan-soft: rgba(92, 212, 255, 0.18);
  --hud-amber: #f7c66b;
  --hud-green: #73e2b1;
  --hud-red: #ff8995;
  --hud-panel: rgba(6, 15, 28, 0.68);
  --hud-panel-strong: rgba(7, 17, 31, 0.88);
  --hud-border: rgba(157, 214, 239, 0.2);
  --hud-border-strong: rgba(156, 231, 255, 0.42);
  --hud-shadow: rgba(1, 7, 18, 0.62);
  color: var(--hud-ink);
  font-family: 'Aptos', 'Avenir Next', 'PingFang SC', 'Segoe UI', sans-serif;
  isolation: isolate;
}

.desktop::before {
  position: absolute;
  inset: 0;
  z-index: 9;
  pointer-events: none;
  content: '';
  background:
    linear-gradient(90deg, rgba(2, 7, 16, 0.42), transparent 24%, transparent 76%, rgba(2, 7, 16, 0.32)),
    radial-gradient(ellipse at 50% 52%, transparent 22%, rgba(1, 6, 15, 0.18) 70%, rgba(1, 4, 10, 0.5) 100%);
}

.desktop-workspace {
  min-height: calc(100% - 3.75rem);
  padding-top: 5.15rem;
  overflow: auto;
  scrollbar-width: thin;
  scrollbar-color: rgba(156, 231, 255, 0.34) transparent;
}

.workspace-hero,
.desktop-main-grid {
  width: min(1360px, 100%);
  margin-right: auto;
  margin-left: auto;
}

.workspace-hero {
  position: relative;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 2rem;
  min-height: 9.25rem;
  margin-bottom: 1.1rem;
  padding: 1.5rem 1.6rem 1.35rem;
  overflow: hidden;
  border: 1px solid var(--hud-border);
  border-radius: 1.35rem;
  background:
    linear-gradient(110deg, rgba(9, 27, 43, 0.88), rgba(8, 21, 36, 0.56) 52%, rgba(7, 15, 27, 0.76)),
    radial-gradient(circle at 76% 0%, rgba(113, 218, 255, 0.18), transparent 42%);
  box-shadow:
    0 18px 54px -32px var(--hud-shadow),
    0 1px 0 rgba(255, 255, 255, 0.12) inset;
  backdrop-filter: blur(14px) saturate(130%);
  -webkit-backdrop-filter: blur(14px) saturate(130%);
}

.workspace-hero::before {
  position: absolute;
  inset: 0;
  content: '';
  pointer-events: none;
  opacity: 0.52;
  background-image:
    linear-gradient(rgba(156, 231, 255, 0.07) 1px, transparent 1px),
    linear-gradient(90deg, rgba(156, 231, 255, 0.07) 1px, transparent 1px);
  background-size: 24px 24px;
  mask-image: linear-gradient(90deg, black, transparent 78%);
}

.workspace-hero::after {
  position: absolute;
  top: 0;
  right: 9%;
  width: 18rem;
  height: 1px;
  content: '';
  background: linear-gradient(90deg, transparent, var(--hud-cyan), transparent);
  box-shadow: 0 0 22px rgba(156, 231, 255, 0.72);
}

.workspace-hero-copy,
.workspace-hero-readout {
  position: relative;
  z-index: 1;
}

.workspace-hero-copy {
  max-width: 42rem;
}

.workspace-eyebrow,
.readout-label,
.launcher-kicker,
.menu-subtitle {
  font-family: 'Cascadia Code', 'SFMono-Regular', Consolas, monospace;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

.workspace-eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 0.48rem;
  color: var(--hud-cyan);
  font-size: 0.64rem;
  font-weight: 700;
}

.workspace-eyebrow-dot,
.status-live-dot {
  display: inline-block;
  width: 0.4rem;
  height: 0.4rem;
  border-radius: 999px;
  background: var(--hud-green);
  box-shadow: 0 0 0 4px rgba(115, 226, 177, 0.1), 0 0 14px rgba(115, 226, 177, 0.82);
}

.workspace-hero h1 {
  margin-top: 0.6rem;
  color: var(--hud-ink);
  font-size: clamp(1.85rem, 3.5vw, 3.3rem);
  font-weight: 630;
  letter-spacing: -0.055em;
  line-height: 1.02;
  text-shadow: 0 8px 30px rgba(2, 9, 20, 0.54);
}

.hero-accent {
  color: var(--hud-cyan);
  text-shadow: 0 0 18px rgba(156, 231, 255, 0.78);
}

.workspace-hero p {
  max-width: 34rem;
  margin-top: 0.72rem;
  color: rgba(203, 220, 237, 0.76);
  font-size: 0.84rem;
  line-height: 1.6;
}

.workspace-hero-readout {
  display: grid;
  min-width: 9.7rem;
  padding: 0.75rem 0.85rem 0.7rem;
  border-left: 1px solid rgba(156, 231, 255, 0.26);
  background: linear-gradient(90deg, rgba(156, 231, 255, 0.04), transparent);
}

.readout-label {
  color: var(--hud-subtle);
  font-size: 0.56rem;
  font-weight: 700;
}

.workspace-hero-readout strong {
  margin-top: 0.12rem;
  color: var(--hud-cyan);
  font-family: 'Cascadia Code', 'SFMono-Regular', Consolas, monospace;
  font-size: 2.2rem;
  font-weight: 500;
  letter-spacing: -0.08em;
  line-height: 1;
  text-shadow: 0 0 18px rgba(156, 231, 255, 0.45);
}

.workspace-hero-readout small {
  color: rgba(198, 218, 234, 0.52);
  font-size: 0.9rem;
  letter-spacing: 0;
}

.readout-sub {
  margin-top: 0.36rem;
  color: var(--hud-green);
  font-family: 'Cascadia Code', 'SFMono-Regular', Consolas, monospace;
  font-size: 0.58rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.desktop-main-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 1rem;
  align-items: start;
}

.desktop-main-area {
  display: grid;
  grid-template-columns: minmax(0, 0.96fr) minmax(300px, 0.92fr);
  gap: 1rem;
  min-width: 0;
  align-items: stretch;
}

.desktop-app-panel,
.orbital-stage {
  min-width: 0;
  border: 1px solid var(--hud-border);
  border-radius: 1.05rem;
  background:
    linear-gradient(145deg, rgba(10, 28, 45, 0.76), rgba(3, 12, 23, 0.82)),
    radial-gradient(circle at 100% 0%, rgba(156, 231, 255, 0.1), transparent 44%);
  box-shadow:
    0 18px 42px -30px var(--hud-shadow),
    0 1px 0 rgba(255, 255, 255, 0.1) inset;
}

.desktop-app-panel {
  padding: 0.9rem 0.82rem 1rem;
}

.desktop-app-panel-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  margin: 0 0 0.72rem;
  padding: 0.12rem 0.22rem 0.78rem;
  border-bottom: 1px solid rgba(142, 164, 190, 0.14);
}

.desktop-panel-kicker,
.desktop-panel-hint,
.orbital-stage-kicker,
.orbital-stage-status,
.orbital-stage-foot {
  font-family: 'Cascadia Code', 'SFMono-Regular', Consolas, monospace;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.desktop-panel-kicker {
  color: var(--hud-cyan);
  font-size: 0.56rem;
  font-weight: 700;
}

.desktop-app-panel-head h2 {
  margin-top: 0.32rem;
  color: var(--hud-ink);
  font-size: 0.98rem;
  font-weight: 650;
  letter-spacing: 0.02em;
}

.desktop-panel-hint {
  padding-top: 0.2rem;
  color: var(--hud-subtle);
  font-size: 0.52rem;
  white-space: nowrap;
}

.desktop-icons {
  align-content: start;
  grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
  justify-items: center;
  gap: 0.9rem 0.35rem;
  padding: 0.15rem 0.1rem 0;
}

.desktop-icons .app-icon {
  width: min(100%, 106px);
}

.orbital-stage {
  position: relative;
  min-height: 35.6rem;
  overflow: hidden;
  isolation: isolate;
}

.orbital-stage::before {
  position: absolute;
  inset: 0;
  z-index: -2;
  content: '';
  pointer-events: none;
  opacity: 0.46;
  background-image:
    linear-gradient(rgba(156, 231, 255, 0.06) 1px, transparent 1px),
    linear-gradient(90deg, rgba(156, 231, 255, 0.06) 1px, transparent 1px);
  background-size: 24px 24px;
  mask-image: radial-gradient(circle at 50% 48%, black 12%, transparent 78%);
}

.orbital-stage::after {
  position: absolute;
  inset: 12% 10% 15%;
  z-index: -1;
  content: '';
  pointer-events: none;
  border: 1px solid rgba(156, 231, 255, 0.09);
  border-radius: 50%;
  box-shadow:
    0 0 0 1rem rgba(156, 231, 255, 0.025),
    0 0 42px rgba(92, 212, 255, 0.08) inset;
  transform: rotate(-14deg) scaleY(0.72);
}

.orbital-stage-head,
.orbital-stage-foot {
  position: absolute;
  right: 0.92rem;
  left: 0.92rem;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.orbital-stage-head {
  top: 0.92rem;
}

.orbital-stage-kicker {
  display: inline-flex;
  align-items: center;
  gap: 0.42rem;
  color: rgba(226, 244, 255, 0.9);
  font-size: 0.58rem;
  font-weight: 700;
}

.orbital-stage-signal {
  width: 0.38rem;
  height: 0.38rem;
  border-radius: 999px;
  background: var(--hud-cyan);
  box-shadow: 0 0 0 4px rgba(156, 231, 255, 0.08), 0 0 14px rgba(156, 231, 255, 0.82);
}

.orbital-stage-status {
  color: var(--hud-green);
  font-size: 0.5rem;
}

.orbital-stage-canvas {
  position: absolute;
  inset: 2.25rem 0.2rem 2.4rem;
  z-index: 0;
}

.orbital-stage-foot {
  bottom: 0.82rem;
  padding-top: 0.68rem;
  border-top: 1px solid rgba(142, 164, 190, 0.14);
  color: var(--hud-subtle);
  font-size: 0.5rem;
}

.orbital-stage-foot strong {
  color: var(--hud-cyan);
  font-size: 0.68rem;
  font-weight: 500;
}

@media (min-width: 1280px) {
  .desktop-main-grid {
    grid-template-columns: minmax(0, 1fr) 320px;
  }
}

@media (min-width: 768px) and (max-width: 1279px) {
  .desktop-main-area {
    grid-template-columns: minmax(0, 0.88fr) minmax(260px, 0.92fr);
  }

  .desktop-icons {
    grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
  }

  .orbital-stage {
    min-height: 31rem;
  }
}

.desktop-side-panel {
  top: 5.1rem;
  gap: 0.7rem;
}

.desktop-side-panel .widget-card {
  padding: 0.76rem;
}

.desktop-side-panel .widget-title {
  margin-bottom: 0.5rem;
}

.desktop-side-panel .widget-metric-row {
  padding: 0.28rem 0;
}

.desktop-side-panel .widget-link {
  min-height: 2.18rem;
  margin-bottom: 0.3rem;
  padding: 0.45rem 0.6rem;
}

.desktop-side-panel .widget-link-icon {
  width: 1.2rem;
  height: 1.2rem;
}

@media (min-width: 768px) and (max-height: 920px) {
  .orbital-stage {
    min-height: 34.4rem;
  }

  .desktop-icons {
    row-gap: 0.55rem;
  }

  .desktop-side-panel .widget-card {
    padding: 0.68rem;
  }

  .desktop-side-panel .widget-title {
    margin-bottom: 0.38rem;
  }

  .desktop-side-panel .widget-metric-row {
    padding: 0.24rem 0;
  }

  .desktop-side-panel .widget-link {
    min-height: 2.02rem;
    margin-bottom: 0.22rem;
    padding: 0.36rem 0.56rem;
  }
}

.widget-card {
  position: relative;
  border-color: var(--hud-border);
  border-radius: 1.05rem;
  padding: 1rem;
  background:
    linear-gradient(145deg, rgba(13, 31, 48, 0.78), rgba(4, 12, 23, 0.84)),
    radial-gradient(circle at 100% 0%, rgba(156, 231, 255, 0.11), transparent 45%);
  box-shadow:
    0 16px 34px -26px var(--hud-shadow),
    0 1px 0 rgba(255, 255, 255, 0.1) inset;
}

.widget-card::before {
  position: absolute;
  top: 0.9rem;
  right: 1rem;
  width: 0.32rem;
  height: 0.32rem;
  content: '';
  border-radius: 999px;
  background: var(--hud-cyan);
  box-shadow: 0 0 12px rgba(156, 231, 255, 0.8);
}

.widget-title {
  margin-bottom: 0.7rem;
  color: rgba(242, 247, 255, 0.94);
  font-family: 'Cascadia Code', 'SFMono-Regular', Consolas, monospace;
  font-size: 0.66rem;
  font-weight: 700;
  letter-spacing: 0.13em;
  text-transform: uppercase;
}

.widget-metric-row {
  padding: 0.42rem 0;
  border-top: 1px solid rgba(142, 164, 190, 0.12);
  color: rgba(186, 207, 225, 0.76);
  font-size: 0.72rem;
}

.widget-metric-row strong {
  color: var(--hud-ink);
  font-family: 'Cascadia Code', 'SFMono-Regular', Consolas, monospace;
  font-size: 0.72rem;
  font-weight: 600;
}

.widget-sub {
  color: var(--hud-subtle);
  font-family: 'Cascadia Code', 'SFMono-Regular', Consolas, monospace;
  font-size: 0.58rem;
  letter-spacing: 0.04em;
}

.widget-link {
  min-height: 2.55rem;
  margin-bottom: 0.48rem;
  border-color: rgba(142, 164, 190, 0.16);
  background: rgba(3, 11, 22, 0.38);
  color: rgba(223, 236, 247, 0.9);
  transition: transform 180ms ease, border-color 180ms ease, background 180ms ease;
}

.widget-link:hover {
  transform: translateX(3px);
  border-color: var(--hud-border-strong);
  background: rgba(27, 77, 105, 0.26);
}

.widget-link-icon {
  display: grid;
  width: 1.35rem;
  height: 1.35rem;
  place-items: center;
  border-radius: 0.4rem;
  color: var(--hud-cyan);
  background: rgba(156, 231, 255, 0.1);
}

.widget-link-domain {
  color: var(--hud-subtle);
  font-family: 'Cascadia Code', 'SFMono-Regular', Consolas, monospace;
  font-size: 0.54rem;
}

.menu-bar {
  height: 3.75rem;
  padding-top: max(0.4rem, env(safe-area-inset-top));
  border-bottom-color: rgba(156, 231, 255, 0.18);
  background:
    linear-gradient(180deg, rgba(8, 22, 37, 0.92), rgba(5, 13, 25, 0.72)),
    radial-gradient(circle at 20% 0%, rgba(156, 231, 255, 0.13), transparent 34%);
  box-shadow:
    0 1px 0 rgba(255, 255, 255, 0.08) inset,
    0 14px 34px -24px rgba(1, 7, 18, 0.9);
}

.menu-brand-group {
  gap: 0.7rem;
}

.menu-brandmark {
  display: grid;
  width: 1.7rem;
  height: 1.7rem;
  place-items: center;
  border: 1px solid rgba(156, 231, 255, 0.6);
  border-radius: 0.55rem;
  color: #06111f;
  background: linear-gradient(145deg, #c7f3ff, #6dc9ea 62%, #306b9b);
  box-shadow: 0 0 0 4px rgba(156, 231, 255, 0.06), 0 0 24px rgba(92, 212, 255, 0.32);
  font-family: 'Cascadia Code', 'SFMono-Regular', Consolas, monospace;
  font-size: 0.92rem;
  font-weight: 800;
}

.menu-brand-copy {
  display: grid;
  gap: 0.03rem;
}

.menu-title {
  color: rgba(244, 250, 255, 0.98);
  font-family: 'Cascadia Code', 'SFMono-Regular', Consolas, monospace;
  font-size: 0.76rem;
  font-weight: 700;
  letter-spacing: 0.13em;
}

.menu-subtitle {
  color: rgba(142, 164, 190, 0.82);
  font-size: 0.46rem;
  font-weight: 600;
}

.menu-divider {
  margin: 0 0.2rem 0 0.3rem;
  background: rgba(156, 231, 255, 0.24);
}

.menu-nav {
  gap: 0.25rem;
}

.menu-nav-item {
  padding: 0.32rem 0.58rem;
  color: rgba(177, 201, 221, 0.7);
  font-family: 'Cascadia Code', 'SFMono-Regular', Consolas, monospace;
  font-size: 0.6rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.menu-nav-item:hover {
  color: var(--hud-cyan);
  background: rgba(156, 231, 255, 0.08);
}

.menu-right-group {
  gap: 0.46rem;
}

.menu-action-btn,
.menu-shortcut-btn {
  height: 1.9rem;
  border-color: rgba(156, 231, 255, 0.2);
  color: rgba(224, 241, 250, 0.9);
  font-family: 'Cascadia Code', 'SFMono-Regular', Consolas, monospace;
  font-size: 0.58rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.menu-action-btn {
  background: rgba(156, 231, 255, 0.1);
}

.menu-shortcut-btn {
  color: var(--hud-cyan);
  background: rgba(3, 11, 22, 0.58);
}

.menu-action-btn:hover,
.menu-shortcut-btn:hover {
  border-color: rgba(156, 231, 255, 0.58);
  background: rgba(156, 231, 255, 0.16);
  box-shadow: 0 0 18px rgba(92, 212, 255, 0.12);
}

.menu-action-btn:focus-visible,
.menu-shortcut-btn:focus-visible,
.status-trigger:focus-visible,
.launcher-chip:focus-visible,
.launcher-item:focus-visible,
.pin-toggle:focus-visible,
.widget-link:focus-visible,
.status-app-row-button:focus-visible {
  outline: 2px solid var(--hud-cyan);
  outline-offset: 3px;
}

.menu-clock {
  color: var(--hud-ink);
  font-family: 'Cascadia Code', 'SFMono-Regular', Consolas, monospace;
  font-size: 0.72rem;
  letter-spacing: 0.08em;
}

.menu-chip-cluster {
  gap: 0.26rem;
  border-color: rgba(156, 231, 255, 0.18);
  background: rgba(3, 11, 22, 0.46);
}

.status-live-dot {
  width: 0.32rem;
  height: 0.32rem;
  margin: 0 0.18rem 0 0.16rem;
}

.status-live-dot.is-checking {
  animation: status-pulse 1.1s ease-in-out infinite;
}

.status-pill {
  border: 0;
  padding: 0.18rem 0.42rem;
  border-radius: 0.42rem;
  background: transparent !important;
  font-family: 'Cascadia Code', 'SFMono-Regular', Consolas, monospace;
  font-size: 0.56rem;
  letter-spacing: 0.03em;
}

.status-pill-reachable {
  color: var(--hud-green);
}

.status-pill-unreachable {
  color: var(--hud-red);
}

.status-pill-unknown {
  color: var(--hud-muted);
}

.status-pill-checking {
  color: var(--hud-cyan);
}

.status-panel {
  top: calc(100% + 0.7rem);
  width: min(590px, calc(100vw - 2rem));
  border-color: var(--hud-border-strong);
  border-radius: 1rem;
  padding: 0.9rem;
  background: var(--hud-panel-strong);
  box-shadow: 0 24px 60px -28px var(--hud-shadow), 0 0 0 1px rgba(156, 231, 255, 0.04) inset;
}

.status-panel-head {
  margin-bottom: 0.8rem;
  color: var(--hud-ink);
  font-family: 'Cascadia Code', 'SFMono-Regular', Consolas, monospace;
  font-size: 0.68rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.status-panel-time {
  color: var(--hud-subtle);
  font-size: 0.56rem;
  letter-spacing: 0.03em;
  text-transform: none;
}

.status-app-row {
  border-color: rgba(142, 164, 190, 0.16);
  background: rgba(3, 11, 22, 0.48);
}

.status-app-row-button:hover {
  border-color: var(--hud-border-strong);
  background: rgba(27, 77, 105, 0.28);
}

.launcher-overlay {
  z-index: var(--z-launcher-overlay, 70);
  padding-top: 7.2rem;
  background: rgba(1, 6, 15, 0.72);
  backdrop-filter: blur(18px) saturate(130%);
}

.launcher-panel {
  width: min(720px, calc(100vw - 1.5rem));
  border-color: var(--hud-border-strong);
  border-radius: 1.25rem;
  background: var(--hud-panel-strong);
  box-shadow: 0 28px 90px -34px rgba(0, 0, 0, 0.92), 0 0 42px rgba(92, 212, 255, 0.12);
}

.launcher-kicker {
  display: flex;
  align-items: center;
  gap: 0.48rem;
  padding: 0.76rem 1rem 0.52rem;
  color: var(--hud-subtle);
  font-size: 0.58rem;
  font-weight: 700;
}

.launcher-kicker-mark {
  display: grid;
  width: 1.45rem;
  height: 1.45rem;
  place-items: center;
  border: 1px solid rgba(156, 231, 255, 0.28);
  border-radius: 0.45rem;
  color: var(--hud-cyan);
  background: rgba(156, 231, 255, 0.1);
}

.launcher-kicker kbd {
  margin-left: auto;
  padding: 0.22rem 0.38rem;
  border: 1px solid rgba(142, 164, 190, 0.24);
  border-radius: 0.35rem;
  color: var(--hud-muted);
  font: inherit;
  letter-spacing: 0.04em;
}

.launcher-input {
  padding: 0.8rem 1rem 1rem;
  border-top: 1px solid rgba(142, 164, 190, 0.12);
  background: rgba(1, 7, 16, 0.66);
  color: var(--hud-ink);
  font-family: 'Aptos', 'Avenir Next', 'PingFang SC', 'Segoe UI', sans-serif;
  font-size: 1rem;
}

.launcher-input:focus-visible {
  outline: 2px solid var(--hud-cyan);
  outline-offset: -2px;
}

.launcher-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.36rem;
  border-color: rgba(156, 231, 255, 0.24);
  color: var(--hud-cyan);
  background: rgba(156, 231, 255, 0.08);
}

.launcher-chip:hover {
  border-color: var(--hud-border-strong);
  background: rgba(156, 231, 255, 0.16);
}

.launcher-chip-muted {
  color: var(--hud-muted);
}

.launcher-item {
  min-height: 3.2rem;
  border-color: rgba(142, 164, 190, 0.16);
  border-radius: 0.86rem;
  background: rgba(3, 11, 22, 0.52);
}

.launcher-item-icon {
  display: grid;
  width: 2rem;
  height: 2rem;
  place-items: center;
  border: 1px solid rgba(156, 231, 255, 0.18);
  border-radius: 0.62rem;
  color: var(--hud-cyan);
  background: rgba(156, 231, 255, 0.09);
}

.launcher-item:hover,
.launcher-item.is-active {
  border-color: var(--hud-border-strong);
  background: rgba(27, 77, 105, 0.28);
  box-shadow: 0 0 20px rgba(92, 212, 255, 0.08) inset;
}

@keyframes status-pulse {
  0%,
  100% { opacity: 0.45; transform: scale(0.82); }
  50% { opacity: 1; transform: scale(1.12); }
}

@media (max-width: 767px) {
  .desktop-main-grid {
    display: block;
  }

  .desktop-main-area {
    position: relative;
    display: block;
  }

  .desktop-app-panel {
    position: relative;
    z-index: 1;
    padding: 0.8rem 0.42rem 1rem;
    background:
      linear-gradient(145deg, rgba(8, 22, 37, 0.52), rgba(3, 12, 23, 0.66)),
      radial-gradient(circle at 50% 0%, rgba(156, 231, 255, 0.08), transparent 54%);
    backdrop-filter: blur(8px);
  }

  .desktop-app-panel-head {
    margin-bottom: 0.52rem;
    padding-bottom: 0.62rem;
  }

  .desktop-panel-hint {
    display: none;
  }

  .desktop-icons {
    grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
    gap: 0.68rem 0.22rem;
  }

  .orbital-stage {
    position: absolute;
    top: 0;
    right: 0;
    left: 0;
    z-index: 0;
    height: 34rem;
    min-height: 0;
    border-color: transparent;
    background: transparent;
    box-shadow: none;
    pointer-events: none;
    opacity: 0.82;
  }

  .orbital-stage-head,
  .orbital-stage-foot {
    display: none;
  }

  .orbital-stage-canvas {
    inset: 3rem 0 0;
  }

  .menu-bar {
    height: 3.35rem;
  }

  .desktop-workspace {
    padding-top: 4.65rem;
  }

  .workspace-hero {
    align-items: stretch;
    flex-direction: column;
    gap: 1.1rem;
    min-height: 0;
    margin-bottom: 0.8rem;
    padding: 1.2rem 1rem 1rem;
    border-radius: 1.05rem;
  }

  .workspace-hero h1 {
    font-size: clamp(1.65rem, 8vw, 2.25rem);
  }

  .workspace-hero p {
    font-size: 0.76rem;
  }

  .workspace-hero-readout {
    display: flex;
    align-items: baseline;
    gap: 0.65rem;
    min-width: 0;
    padding: 0.62rem 0 0;
    border-top: 1px solid rgba(156, 231, 255, 0.16);
    border-left: 0;
  }

  .workspace-hero-readout strong {
    font-size: 1.6rem;
  }

  .readout-sub {
    margin-top: 0;
  }

  .menu-title {
    font-size: 0.65rem;
  }

  .menu-subtitle {
    font-size: 0.4rem;
  }

  .menu-brandmark {
    width: 1.5rem;
    height: 1.5rem;
    font-size: 0.78rem;
  }

  .menu-action-btn {
    display: none;
  }

  .menu-shortcut-btn {
    min-width: 3.2rem;
    padding: 0 0.48rem;
  }

  .menu-clock {
    min-width: 0;
    font-size: 0.62rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .desktop::before,
  .workspace-hero::after,
  .status-live-dot.is-checking {
    animation: none;
  }

  .widget-link,
  .menu-action-btn,
  .menu-shortcut-btn {
    transition: none;
  }
}

/* Liquid glass visual system */
.desktop {
  --liquid-ink: #182235;
  --liquid-muted: #667085;
  --liquid-subtle: #8b98aa;
  --liquid-blue: #4f86ee;
  --liquid-blue-soft: rgba(79, 134, 238, 0.14);
  --liquid-green: #238c68;
  --liquid-red: #c85e6d;
  --liquid-border: rgba(255, 255, 255, 0.7);
  --liquid-border-soft: rgba(116, 133, 158, 0.18);
  --liquid-surface: rgba(255, 255, 255, 0.52);
  --liquid-surface-strong: rgba(250, 252, 255, 0.76);
  --liquid-shadow: 0 24px 60px rgba(94, 108, 133, 0.16), 0 2px 0 rgba(255, 255, 255, 0.78) inset;
  color: var(--liquid-ink);
  background: linear-gradient(135deg, #edf2f8 0%, #e7edf5 45%, #dce7f2 100%);
  font-family: system-ui, -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', 'PingFang SC', 'Segoe UI', sans-serif;
  isolation: isolate;
}

.desktop-wallpaper-layer,
.desktop-light-overlay,
.tech-grid-layer,
.tech-scan-layer,
.tech-glow-layer,
.tech-node,
.tech-beam,
.cyber-noise-layer,
.ambient-wave,
.ambient-orb {
  display: none !important;
}

.liquid-ambient-layer {
  position: absolute;
  inset: 0;
  z-index: 0;
  overflow: hidden;
  pointer-events: none;
}

.liquid-ambient-blob {
  position: absolute;
  width: 22rem;
  height: 15rem;
  border-radius: 48% 52% 58% 42% / 42% 44% 56% 58%;
  filter: blur(28px);
  opacity: 0.42;
}

.liquid-ambient-blob-a {
  top: 6%;
  left: -5%;
  background: rgba(155, 194, 255, 0.32);
  animation: liquid-ambient-drift-a 18s ease-in-out infinite;
}

.liquid-ambient-blob-b {
  right: -4%;
  bottom: 2%;
  background: rgba(219, 187, 245, 0.24);
  animation: liquid-ambient-drift-b 22s ease-in-out infinite;
}

.desktop::before {
  z-index: 0;
  background:
    radial-gradient(circle at 8% 4%, rgba(255, 255, 255, 0.9), transparent 28%),
    radial-gradient(circle at 88% 16%, rgba(184, 210, 255, 0.46), transparent 34%),
    linear-gradient(180deg, rgba(248, 250, 253, 0.18), rgba(214, 226, 239, 0.24));
}

.desktop::after {
  position: absolute;
  inset: -12%;
  z-index: 0;
  content: '';
  pointer-events: none;
  opacity: 0.72;
  background:
    radial-gradient(ellipse at 16% 72%, rgba(164, 202, 255, 0.36) 0%, rgba(164, 202, 255, 0) 36%),
    radial-gradient(ellipse at 78% 54%, rgba(226, 190, 255, 0.25) 0%, rgba(226, 190, 255, 0) 32%),
    radial-gradient(ellipse at 54% 96%, rgba(164, 238, 220, 0.2) 0%, rgba(164, 238, 220, 0) 30%);
  filter: blur(22px);
}

.desktop-workspace {
  padding-top: 5.2rem;
  padding-bottom: 7.9rem;
  scrollbar-color: rgba(104, 123, 151, 0.26) transparent;
}

.workspace-hero,
.desktop-app-panel,
.focus-stage,
.widget-card {
  border: 1px solid var(--liquid-border);
  background: var(--liquid-surface);
  box-shadow: var(--liquid-shadow);
  backdrop-filter: blur(30px) saturate(150%);
  -webkit-backdrop-filter: blur(30px) saturate(150%);
}

.workspace-hero {
  min-height: 10.2rem;
  margin-bottom: 1.15rem;
  padding: 1.65rem 1.8rem 1.55rem;
  border-radius: 1.8rem;
  align-items: center;
  background:
    linear-gradient(120deg, rgba(255, 255, 255, 0.72), rgba(249, 251, 255, 0.42) 54%, rgba(227, 237, 250, 0.42)),
    radial-gradient(circle at 83% 0%, rgba(174, 207, 255, 0.38), transparent 42%);
  box-shadow: 0 28px 70px rgba(112, 129, 154, 0.16), 0 2px 0 rgba(255, 255, 255, 0.84) inset;
}

.workspace-hero::before {
  opacity: 0.52;
  background:
    radial-gradient(circle at 80% 20%, rgba(255, 255, 255, 0.72), transparent 30%),
    linear-gradient(120deg, transparent 0%, rgba(255, 255, 255, 0.34) 50%, transparent 76%);
  background-size: auto;
  mask-image: none;
}

.workspace-hero::after {
  top: 1.1rem;
  right: 12%;
  width: 7rem;
  height: 0.32rem;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.64);
  box-shadow: 0 0 28px rgba(145, 179, 239, 0.28);
  opacity: 0.8;
}

.workspace-hero-copy,
.workspace-hero-readout {
  z-index: 1;
}

.workspace-hero-copy {
  max-width: 46rem;
}

.workspace-eyebrow,
.readout-label,
.desktop-panel-kicker,
.desktop-panel-hint,
.focus-stage-kicker,
.focus-stage-status,
.widget-sub {
  font-family: inherit;
  letter-spacing: 0.015em;
  text-transform: none;
}

.workspace-eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 0.44rem;
  color: var(--liquid-muted);
  font-size: 0.7rem;
  font-weight: 650;
}

.workspace-eyebrow-dot {
  width: 0.45rem;
  height: 0.45rem;
  border-radius: 999px;
  background: #61b9a0;
  box-shadow: 0 0 0 0.25rem rgba(97, 185, 160, 0.13);
}

.workspace-hero h1 {
  margin-top: 0.7rem;
  color: var(--liquid-ink);
  font-size: clamp(2.35rem, 4.2vw, 4.2rem);
  font-weight: 720;
  letter-spacing: -0.055em;
  line-height: 0.98;
}

.hero-accent {
  color: var(--liquid-blue);
}

.workspace-hero p {
  max-width: 34rem;
  margin-top: 0.72rem;
  color: var(--liquid-muted);
  font-size: 0.88rem;
  line-height: 1.65;
}

.workspace-hero-readout {
  min-width: 10.2rem;
  padding: 0.65rem 0 0.65rem 1.1rem;
  border-left: 1px solid rgba(116, 133, 158, 0.2);
  background: linear-gradient(90deg, rgba(255, 255, 255, 0.2), transparent);
}

.readout-label {
  color: var(--liquid-muted);
  font-size: 0.68rem;
  font-weight: 650;
}

.workspace-hero-readout strong {
  display: block;
  margin-top: 0.2rem;
  color: var(--liquid-ink);
  font-family: inherit;
  font-size: 2.45rem;
  font-weight: 700;
  letter-spacing: -0.08em;
  line-height: 1;
  text-shadow: none;
}

.workspace-hero-readout small {
  color: var(--liquid-subtle);
  font-size: 0.9rem;
  letter-spacing: 0;
}

.readout-sub {
  display: block;
  margin-top: 0.45rem;
  color: var(--liquid-green);
  font-family: inherit;
  font-size: 0.66rem;
  letter-spacing: 0.01em;
  text-transform: none;
}

.desktop-main-grid {
  gap: 1.15rem;
}

.desktop-main-area {
  gap: 1.15rem;
}

.desktop-app-panel,
.focus-stage {
  border-radius: 1.6rem;
  background:
    linear-gradient(145deg, rgba(255, 255, 255, 0.66), rgba(246, 249, 254, 0.38)),
    radial-gradient(circle at 100% 0%, rgba(187, 214, 255, 0.28), transparent 42%);
  box-shadow: 0 22px 54px rgba(101, 119, 146, 0.14), 0 2px 0 rgba(255, 255, 255, 0.84) inset;
}

.desktop-app-panel {
  padding: 1.08rem 1rem 1.15rem;
}

.desktop-app-panel-head {
  margin-bottom: 0.78rem;
  padding: 0.1rem 0.22rem 0.82rem;
  border-bottom: 1px solid rgba(116, 133, 158, 0.15);
}

.desktop-panel-kicker {
  color: var(--liquid-muted);
  font-size: 0.68rem;
  font-weight: 650;
}

.desktop-app-panel-head h2 {
  margin-top: 0.4rem;
  color: var(--liquid-ink);
  font-size: 1.12rem;
  font-weight: 700;
  letter-spacing: -0.02em;
}

.desktop-panel-hint {
  padding-top: 0.2rem;
  color: var(--liquid-subtle);
  font-size: 0.68rem;
}

.desktop-icons {
  gap: 0.72rem 0.42rem;
  padding: 0.12rem 0.08rem 0;
}

.focus-stage {
  position: relative;
  min-height: 30rem;
  overflow: hidden;
  isolation: isolate;
}

.focus-stage::before {
  position: absolute;
  inset: 0;
  z-index: -2;
  content: '';
  pointer-events: none;
  background:
    radial-gradient(circle at 52% 43%, rgba(255, 255, 255, 0.82), transparent 24%),
    radial-gradient(circle at 78% 18%, rgba(204, 222, 255, 0.56), transparent 32%),
    linear-gradient(150deg, rgba(255, 255, 255, 0.36), rgba(215, 228, 246, 0.2));
}

.focus-stage::after {
  position: absolute;
  inset: 16% 14% 18%;
  z-index: -1;
  content: '';
  pointer-events: none;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255, 255, 255, 0.54), rgba(196, 218, 252, 0.16) 48%, transparent 70%);
  filter: blur(16px);
}

.focus-stage-head,
.focus-stage-foot {
  position: absolute;
  right: 1.2rem;
  left: 1.2rem;
  z-index: 2;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
}

.focus-stage-head {
  top: 1.15rem;
}

.focus-stage-kicker {
  color: var(--liquid-muted);
  font-size: 0.7rem;
  font-weight: 650;
}

.focus-stage-head h2 {
  max-width: 13rem;
  margin-top: 0.45rem;
  color: var(--liquid-ink);
  font-size: clamp(1.35rem, 2.1vw, 1.9rem);
  font-weight: 700;
  letter-spacing: -0.045em;
  line-height: 1.08;
}

.focus-stage-status {
  display: inline-flex;
  align-items: center;
  gap: 0.38rem;
  padding: 0.38rem 0.62rem;
  border: 1px solid rgba(255, 255, 255, 0.64);
  border-radius: 999px;
  color: var(--liquid-muted);
  font-size: 0.66rem;
  background: rgba(255, 255, 255, 0.35);
  box-shadow: 0 1px 0 rgba(255, 255, 255, 0.7) inset;
}

.focus-stage-status-dot {
  width: 0.4rem;
  height: 0.4rem;
  border-radius: 999px;
  background: #65b99d;
  box-shadow: 0 0 0 0.22rem rgba(101, 185, 157, 0.13);
}

.focus-visual {
  position: absolute;
  inset: 5.8rem 0 4.25rem;
  display: grid;
  place-items: center;
}

.focus-glass-orb {
  position: relative;
  width: clamp(10rem, 18vw, 14.8rem);
  aspect-ratio: 1;
  border: 1px solid rgba(255, 255, 255, 0.86);
  border-radius: 42% 58% 61% 39% / 42% 43% 57% 58%;
  background:
    linear-gradient(145deg, rgba(255, 255, 255, 0.82), rgba(232, 241, 255, 0.24) 46%, rgba(177, 204, 246, 0.4)),
    radial-gradient(circle at 28% 24%, rgba(255, 255, 255, 0.92), transparent 25%);
  box-shadow:
    0 36px 72px rgba(99, 128, 177, 0.2),
    0 12px 30px rgba(255, 255, 255, 0.5) inset,
    -14px -12px 26px rgba(255, 255, 255, 0.36) inset,
    18px 18px 28px rgba(147, 177, 225, 0.2) inset;
  transform: rotate(-12deg);
  animation: liquid-orb-float 8s ease-in-out infinite;
}

.focus-glass-orb::before {
  position: absolute;
  inset: 12% 16% 48% 10%;
  content: '';
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.48);
  filter: blur(5px);
  transform: rotate(-22deg);
}

.focus-glass-orb::after {
  position: absolute;
  right: -1.6rem;
  bottom: 8%;
  width: 4.6rem;
  height: 4.6rem;
  content: '';
  border-radius: 45% 55% 54% 46%;
  background: rgba(255, 255, 255, 0.28);
  filter: blur(1px);
  box-shadow: 0 12px 24px rgba(100, 128, 177, 0.1) inset;
}

.focus-orb-highlight,
.focus-orb-shade,
.focus-orb-glow {
  position: absolute;
  pointer-events: none;
}

.focus-orb-highlight {
  top: 22%;
  left: 18%;
  width: 2.8rem;
  height: 1.2rem;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.72);
  filter: blur(7px);
  transform: rotate(-28deg);
}

.focus-orb-shade {
  right: 7%;
  bottom: 12%;
  width: 5.5rem;
  height: 3.4rem;
  border-radius: 50%;
  background: rgba(123, 157, 211, 0.16);
  filter: blur(14px);
  transform: rotate(-24deg);
}

.focus-orb-glow {
  width: 7rem;
  height: 7rem;
  border-radius: 50%;
  filter: blur(26px);
}

.focus-orb-glow-a {
  top: 15%;
  left: 19%;
  background: rgba(157, 193, 255, 0.3);
}

.focus-orb-glow-b {
  right: 16%;
  bottom: 10%;
  background: rgba(216, 183, 244, 0.24);
}

.focus-stage-foot {
  bottom: 1.08rem;
  align-items: center;
  padding-top: 0.75rem;
  border-top: 1px solid rgba(116, 133, 158, 0.15);
  color: var(--liquid-muted);
  font-size: 0.68rem;
}

.focus-stage-foot-mark {
  color: #8ba9e7;
  font-size: 1rem;
}

.desktop-side-panel {
  gap: 0.78rem;
}

.widget-card {
  border-radius: 1.45rem;
  padding: 1rem;
  background:
    linear-gradient(145deg, rgba(255, 255, 255, 0.68), rgba(247, 250, 255, 0.42)),
    radial-gradient(circle at 100% 0%, rgba(194, 218, 255, 0.28), transparent 45%);
  box-shadow: 0 18px 44px rgba(101, 119, 146, 0.12), 0 2px 0 rgba(255, 255, 255, 0.82) inset;
}

.widget-card::before {
  top: 1rem;
  right: 1rem;
  width: 0.38rem;
  height: 0.38rem;
  background: #77bfa7;
  box-shadow: 0 0 0 0.25rem rgba(119, 191, 167, 0.12);
}

.widget-title {
  margin-bottom: 0.75rem;
  color: var(--liquid-ink);
  font-family: inherit;
  font-size: 0.8rem;
  font-weight: 700;
  letter-spacing: 0;
  text-transform: none;
}

.widget-metric-row {
  border-top-color: rgba(116, 133, 158, 0.14);
  color: var(--liquid-muted);
  font-size: 0.74rem;
}

.widget-metric-row strong {
  color: var(--liquid-ink);
  font-family: inherit;
  font-size: 0.76rem;
}

.widget-sub {
  color: var(--liquid-subtle);
  font-size: 0.64rem;
}

.widget-link {
  border: 1px solid rgba(116, 133, 158, 0.15);
  border-radius: 0.95rem;
  background: rgba(255, 255, 255, 0.36);
  color: var(--liquid-ink);
  box-shadow: 0 1px 0 rgba(255, 255, 255, 0.56) inset;
}

.widget-link:hover {
  border-color: rgba(103, 145, 221, 0.42);
  background: rgba(255, 255, 255, 0.62);
  box-shadow: 0 8px 20px rgba(103, 131, 177, 0.1);
}

.widget-link-icon {
  color: #5f88d2;
  background: rgba(113, 158, 239, 0.12);
}

.widget-link-domain {
  color: var(--liquid-subtle);
  font-family: inherit;
  font-size: 0.58rem;
}

.menu-bar {
  height: 3.85rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.66);
  background: rgba(248, 250, 253, 0.55);
  box-shadow: 0 12px 34px rgba(106, 122, 146, 0.08), 0 1px 0 rgba(255, 255, 255, 0.82) inset;
  backdrop-filter: blur(28px) saturate(160%);
  -webkit-backdrop-filter: blur(28px) saturate(160%);
}

.menu-brand-group {
  gap: 0.7rem;
}

.menu-brandmark {
  width: 1.82rem;
  height: 1.82rem;
  border: 1px solid rgba(255, 255, 255, 0.82);
  border-radius: 0.64rem;
  color: #315ca8;
  background: linear-gradient(145deg, rgba(255, 255, 255, 0.92), rgba(175, 210, 255, 0.76));
  box-shadow: 0 8px 18px rgba(92, 131, 203, 0.18), 0 1px 0 rgba(255, 255, 255, 0.9) inset;
  font-family: inherit;
}

.menu-title {
  color: var(--liquid-ink);
  font-family: inherit;
  font-size: 0.78rem;
  font-weight: 750;
  letter-spacing: 0.12em;
}

.menu-subtitle {
  color: var(--liquid-subtle);
  font-size: 0.48rem;
  letter-spacing: 0.09em;
}

.menu-divider {
  background: rgba(116, 133, 158, 0.24);
}

.menu-nav {
  gap: 0.18rem;
}

.menu-nav-item {
  padding: 0.4rem 0.64rem;
  border-radius: 999px;
  color: var(--liquid-muted);
  font-family: inherit;
  font-size: 0.7rem;
  letter-spacing: 0;
  text-transform: none;
}

.menu-nav-item:hover {
  color: var(--liquid-ink);
  background: rgba(255, 255, 255, 0.56);
}

.menu-right-group {
  gap: 0.42rem;
}

.menu-action-btn,
.menu-shortcut-btn {
  height: 1.95rem;
  border: 1px solid rgba(255, 255, 255, 0.72);
  color: var(--liquid-muted);
  font-family: inherit;
  font-size: 0.66rem;
  letter-spacing: 0;
  text-transform: none;
  background: rgba(255, 255, 255, 0.35);
  box-shadow: 0 1px 0 rgba(255, 255, 255, 0.65) inset;
}

.menu-shortcut-btn {
  color: #4d73bc;
  background: rgba(235, 242, 255, 0.52);
}

.menu-action-btn:hover,
.menu-shortcut-btn:hover {
  border-color: rgba(112, 150, 219, 0.42);
  color: var(--liquid-ink);
  background: rgba(255, 255, 255, 0.7);
  box-shadow: 0 8px 18px rgba(106, 132, 177, 0.12);
}

.menu-clock {
  color: var(--liquid-ink);
  font-family: inherit;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0;
}

.menu-chip-cluster {
  border-color: rgba(255, 255, 255, 0.72);
  background: rgba(255, 255, 255, 0.38);
  box-shadow: 0 1px 0 rgba(255, 255, 255, 0.66) inset;
}

.status-pill {
  font-family: inherit;
  font-size: 0.62rem;
  letter-spacing: 0;
}

.status-pill-reachable { color: var(--liquid-green); }
.status-pill-unreachable { color: var(--liquid-red); }
.status-pill-unknown { color: var(--liquid-muted); }
.status-pill-checking { color: var(--liquid-blue); }

.status-panel,
.launcher-panel {
  border: 1px solid rgba(255, 255, 255, 0.78);
  background: rgba(248, 251, 255, 0.76);
  color: var(--liquid-ink);
  box-shadow: 0 28px 70px rgba(79, 99, 132, 0.2), 0 2px 0 rgba(255, 255, 255, 0.84) inset;
  backdrop-filter: blur(30px) saturate(160%);
  -webkit-backdrop-filter: blur(30px) saturate(160%);
}

.status-panel-head,
.launcher-kicker {
  color: var(--liquid-ink);
  font-family: inherit;
  letter-spacing: 0;
  text-transform: none;
}

.status-panel-time,
.status-empty,
.launcher-quick-label {
  color: var(--liquid-subtle);
}

.status-app-row,
.launcher-item {
  border-color: rgba(116, 133, 158, 0.15);
  background: rgba(255, 255, 255, 0.36);
  color: var(--liquid-ink);
}

.status-app-row-button:hover,
.launcher-item:hover,
.launcher-item.is-active {
  border-color: rgba(103, 145, 221, 0.38);
  background: rgba(232, 241, 255, 0.72);
  box-shadow: 0 8px 20px rgba(103, 131, 177, 0.1);
}

.launcher-overlay {
  background: rgba(214, 224, 238, 0.42);
  backdrop-filter: blur(18px) saturate(120%);
}

.launcher-input {
  border-top-color: rgba(116, 133, 158, 0.14);
  background: rgba(255, 255, 255, 0.38);
  color: var(--liquid-ink);
}

.launcher-kicker-mark,
.launcher-item-icon {
  border-color: rgba(255, 255, 255, 0.74);
  color: #5b83ce;
  background: rgba(224, 236, 255, 0.64);
}

.launcher-chip {
  border-color: rgba(255, 255, 255, 0.7);
  color: #5579bd;
  background: rgba(228, 238, 255, 0.54);
}

.launcher-chip:hover {
  border-color: rgba(103, 145, 221, 0.4);
  background: rgba(255, 255, 255, 0.7);
}

.boot-sequence {
  background: rgba(235, 241, 249, 0.96);
  color: var(--liquid-ink);
  backdrop-filter: blur(28px);
}

.boot-scan-layer,
.boot-noise-layer,
.boot-particle,
.boot-orbit-ring {
  display: none !important;
}

.boot-core {
  color: var(--liquid-ink);
}

.boot-orbit {
  width: 7rem;
  height: 7rem;
  border: 1px solid rgba(255, 255, 255, 0.82);
  border-radius: 2rem;
  background: linear-gradient(145deg, rgba(255, 255, 255, 0.86), rgba(201, 222, 255, 0.62));
  box-shadow: 0 24px 50px rgba(92, 126, 193, 0.18), 0 1px 0 rgba(255, 255, 255, 0.9) inset;
}

.boot-logo {
  color: #426bb4;
  font-family: inherit;
  font-size: 0.8rem;
  letter-spacing: 0.04em;
}

.boot-subtitle,
.boot-progress-text {
  color: var(--liquid-muted);
  font-family: inherit;
}

.boot-progress-track {
  background: rgba(130, 151, 184, 0.18);
}

.boot-progress-fill {
  background: linear-gradient(90deg, #8bb5ff, #668bd6);
  box-shadow: none;
}

@keyframes liquid-orb-float {
  0%,
  100% { transform: translate3d(0, 0, 0) rotate(-12deg); }
  50% { transform: translate3d(0, -10px, 0) rotate(-7deg); }
}

@keyframes liquid-ambient-drift-a {
  0%,
  100% { transform: translate3d(0, 0, 0) rotate(-8deg); }
  50% { transform: translate3d(7vw, 3vh, 0) rotate(5deg); }
}

@keyframes liquid-ambient-drift-b {
  0%,
  100% { transform: translate3d(0, 0, 0) rotate(6deg); }
  50% { transform: translate3d(-5vw, -4vh, 0) rotate(-8deg); }
}

@media (max-width: 1279px) {
  .focus-stage {
    min-height: 29rem;
  }
}

@media (min-width: 1280px) and (max-height: 920px) {
  .desktop-side-panel {
    gap: 0.46rem;
  }

  .desktop-side-panel .widget-card {
    padding: 0.66rem;
  }

  .desktop-side-panel .widget-title {
    margin-bottom: 0.34rem;
  }

  .desktop-side-panel .widget-metric-row {
    padding: 0.18rem 0;
  }

  .desktop-side-panel .widget-link {
    min-height: 1.82rem;
    margin-bottom: 0.12rem;
    padding: 0.24rem 0.46rem;
  }
}

@media (max-width: 767px) {
  .desktop-workspace {
    padding-top: 4.75rem;
    padding-bottom: 7.5rem;
  }

  .workspace-hero {
    min-height: 0;
    margin-bottom: 0.85rem;
    padding: 1.3rem 1.05rem 1.1rem;
    border-radius: 1.45rem;
  }

  .workspace-hero h1 {
    margin-top: 0.62rem;
    font-size: clamp(2rem, 10vw, 2.8rem);
    letter-spacing: -0.06em;
  }

  .workspace-hero p {
    margin-top: 0.65rem;
    font-size: 0.78rem;
  }

  .workspace-hero-readout {
    display: flex;
    align-items: baseline;
    gap: 0.64rem;
    min-width: 0;
    padding: 0.72rem 0 0;
    border-top: 1px solid rgba(116, 133, 158, 0.16);
    border-left: 0;
    background: none;
  }

  .workspace-hero-readout strong {
    font-size: 1.8rem;
  }

  .readout-sub {
    margin-top: 0;
  }

  .desktop-app-panel {
    padding: 0.92rem 0.52rem 1rem;
    border-radius: 1.35rem;
  }

  .desktop-app-panel-head {
    padding-right: 0.34rem;
    padding-left: 0.34rem;
  }

  .desktop-panel-hint {
    display: none;
  }

  .desktop-icons {
    gap: 0.55rem 0.22rem;
  }

  .focus-stage {
    min-height: 22rem;
    margin-top: 0.85rem;
    border-radius: 1.35rem;
  }

  .focus-stage-head,
  .focus-stage-foot {
    right: 1rem;
    left: 1rem;
  }

  .focus-stage-head {
    top: 0.95rem;
  }

  .focus-stage-head h2 {
    max-width: 11rem;
    font-size: 1.3rem;
  }

  .focus-stage-status {
    padding: 0.32rem 0.5rem;
    font-size: 0.6rem;
  }

  .focus-visual {
    inset: 4.6rem 0 3.6rem;
  }

  .focus-glass-orb {
    width: 9.4rem;
  }

  .focus-stage-foot {
    bottom: 0.82rem;
    font-size: 0.62rem;
  }

  .menu-bar {
    height: 3.45rem;
  }

  .menu-brandmark {
    width: 1.58rem;
    height: 1.58rem;
  }

  .menu-title {
    font-size: 0.68rem;
  }

  .menu-subtitle {
    font-size: 0.4rem;
  }

  .menu-action-btn {
    display: none;
  }

  .menu-shortcut-btn {
    min-width: 3.15rem;
    padding: 0 0.46rem;
  }
}

@media (prefers-reduced-transparency: reduce) {
  .workspace-hero,
  .desktop-app-panel,
  .focus-stage,
  .widget-card,
  .menu-bar,
  .status-panel,
  .launcher-panel {
    background: rgba(248, 250, 253, 0.96);
    backdrop-filter: none;
    -webkit-backdrop-filter: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .focus-glass-orb,
  .liquid-ambient-blob {
    animation: none;
  }
}

/* Material hierarchy: glass floats, content stays calm */
.desktop-app-panel {
  background:
    linear-gradient(145deg, rgba(252, 253, 255, 0.88), rgba(245, 249, 254, 0.7)),
    radial-gradient(circle at 100% 0%, rgba(190, 216, 255, 0.22), transparent 42%);
  box-shadow: 0 20px 44px rgba(101, 119, 146, 0.11), 0 2px 0 rgba(255, 255, 255, 0.92) inset;
  backdrop-filter: blur(18px) saturate(125%);
  -webkit-backdrop-filter: blur(18px) saturate(125%);
}

.widget-card {
  background:
    linear-gradient(145deg, rgba(252, 253, 255, 0.9), rgba(246, 249, 254, 0.78)),
    radial-gradient(circle at 100% 0%, rgba(194, 218, 255, 0.2), transparent 45%);
  box-shadow: 0 16px 36px rgba(101, 119, 146, 0.1), 0 2px 0 rgba(255, 255, 255, 0.9) inset;
  backdrop-filter: blur(16px) saturate(120%);
  -webkit-backdrop-filter: blur(16px) saturate(120%);
}

@media (min-width: 1280px) and (min-height: 921px) {
  .desktop-side-panel {
    gap: 0.58rem;
  }

  .desktop-side-panel .widget-card {
    padding: 0.7rem;
  }

  .desktop-side-panel .widget-title {
    margin-bottom: 0.38rem;
  }

  .desktop-side-panel .widget-metric-row {
    padding: 0.2rem 0;
  }

  .desktop-side-panel .widget-link {
    min-height: 1.96rem;
    margin-bottom: 0.16rem;
    padding: 0.28rem 0.5rem;
  }
}

@media (prefers-reduced-transparency: reduce) {
  .desktop-app-panel,
  .widget-card {
    background: #f8fafc;
    backdrop-filter: none;
    -webkit-backdrop-filter: none;
  }
}

/* Small controls: quiet, tactile, and easy to dismiss */
.menu-nav-item {
  border: 0;
  cursor: pointer;
  background: transparent;
}

.menu-nav-item:active,
.appearance-option:active,
.appearance-setting:active {
  transform: scale(0.97);
}

.menu-nav-item:focus-visible,
.appearance-control > button:focus-visible,
.appearance-option:focus-visible,
.appearance-setting:focus-visible {
  outline: 2px solid rgba(91, 131, 206, 0.72);
  outline-offset: 3px;
}

.appearance-control {
  position: relative;
}

.appearance-panel {
  position: absolute;
  top: calc(100% + 0.7rem);
  right: 0;
  z-index: 80;
  width: min(18rem, calc(100vw - 1.5rem));
  padding: 0.72rem;
  border: 1px solid rgba(255, 255, 255, 0.78);
  border-radius: 1.15rem;
  background: rgba(248, 251, 255, 0.84);
  color: #182235;
  box-shadow: 0 24px 54px rgba(73, 91, 121, 0.2), 0 2px 0 rgba(255, 255, 255, 0.84) inset;
  backdrop-filter: blur(28px) saturate(155%);
  -webkit-backdrop-filter: blur(28px) saturate(155%);
}

.appearance-panel-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.2rem 0.25rem 0.65rem;
  border-bottom: 1px solid rgba(116, 133, 158, 0.14);
  color: #182235;
  font-size: 0.76rem;
  font-weight: 700;
}

.appearance-panel-head span:last-child {
  color: #8b98aa;
  font-size: 0.62rem;
  font-weight: 500;
}

.appearance-options {
  display: grid;
  gap: 0.35rem;
  margin-top: 0.55rem;
}

.appearance-option {
  display: grid;
  grid-template-columns: 1.25rem 1fr auto;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  padding: 0.5rem 0.45rem;
  border: 1px solid transparent;
  border-radius: 0.78rem;
  color: #344056;
  font-size: 0.72rem;
  text-align: left;
  background: transparent;
  transition: background 160ms ease, border-color 160ms ease, transform 160ms ease;
}

.appearance-option:hover,
.appearance-option.active {
  border-color: rgba(91, 131, 206, 0.24);
  background: rgba(224, 236, 255, 0.58);
}

.appearance-swatch {
  width: 1rem;
  height: 1rem;
  border: 1px solid rgba(255, 255, 255, 0.8);
  border-radius: 0.35rem;
  box-shadow: 0 1px 0 rgba(255, 255, 255, 0.7) inset;
}

.appearance-check {
  color: #4f86ee;
  font-weight: 700;
}

.appearance-setting {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  margin-top: 0.42rem;
  padding: 0.58rem 0.45rem 0.1rem;
  border: 0;
  border-top: 1px solid rgba(116, 133, 158, 0.14);
  color: #667085;
  font-size: 0.68rem;
  text-align: left;
  background: transparent;
}

.appearance-setting + .appearance-setting {
  margin-top: 0;
  padding-top: 0.48rem;
  border-top: 0;
}

.appearance-setting span:last-child {
  color: #5579bd;
  font-weight: 650;
}

.focus-stage-head h2 {
  display: flex;
  max-width: none;
  flex-direction: column;
  gap: 0.08em;
}

.focus-stage-head h2 span:last-child {
  color: #5579bd;
}

@media (prefers-reduced-transparency: reduce) {
  .appearance-panel {
    background: #f8fafc;
    backdrop-filter: none;
    -webkit-backdrop-filter: none;
  }
}

@media (max-width: 767px) {
  .appearance-control > .menu-action-btn {
    display: inline-flex;
    min-width: 3.15rem;
    padding: 0 0.46rem;
  }

  .appearance-panel {
    right: -0.4rem;
  }

  .focus-stage-head h2 {
    font-size: 1.3rem;
  }
}

/* Liquid focus orb: slow internal flow with a soft glass edge */
.focus-stage {
  background:
    radial-gradient(circle at 50% 43%, rgba(255, 255, 255, 0.72), transparent 28%),
    linear-gradient(145deg, rgba(255, 255, 255, 0.72), rgba(244, 249, 255, 0.48) 52%, rgba(230, 236, 249, 0.42));
}

.focus-stage::before {
  background-size: 135% 135%;
  animation: focus-liquid-light 14s ease-in-out infinite;
}

.focus-glass-orb {
  overflow: hidden;
  isolation: isolate;
  background:
    radial-gradient(ellipse at 25% 20%, rgba(255, 255, 255, 0.96) 0 8%, transparent 28%),
    radial-gradient(ellipse at 78% 76%, rgba(150, 185, 246, 0.34), transparent 38%),
    radial-gradient(ellipse at 48% 48%, rgba(255, 255, 255, 0.72), transparent 58%),
    linear-gradient(145deg, rgba(255, 255, 255, 0.84), rgba(228, 239, 255, 0.28) 48%, rgba(185, 210, 249, 0.42));
  animation: liquid-orb-morph 12s ease-in-out infinite;
}

.focus-liquid-swell,
.focus-liquid-sheen,
.focus-liquid-bubble {
  position: absolute;
  pointer-events: none;
}

.focus-liquid-swell {
  inset: -18%;
  z-index: 0;
  border-radius: 50%;
  opacity: 0.86;
  filter: blur(0.7px) saturate(130%);
}

.focus-liquid-swell-a {
  background: radial-gradient(
    ellipse at 30% 38%,
    rgba(255, 255, 255, 0.76) 0 9%,
    rgba(167, 207, 255, 0.66) 25%,
    rgba(121, 171, 248, 0.2) 46%,
    transparent 66%
  );
  animation: liquid-swell-a 7s ease-in-out infinite;
}

.focus-liquid-swell-b {
  background: radial-gradient(
    ellipse at 70% 67%,
    rgba(228, 207, 255, 0.62) 0 8%,
    rgba(132, 181, 249, 0.5) 23%,
    rgba(174, 199, 250, 0.18) 44%,
    transparent 68%
  );
  animation: liquid-swell-b 8.2s ease-in-out infinite;
}

.focus-liquid-sheen {
  inset: -42%;
  z-index: 3;
  border-radius: 50%;
  background: conic-gradient(
    from 205deg,
    transparent 0 22%,
    rgba(255, 255, 255, 0.7) 31%,
    transparent 43% 63%,
    rgba(255, 255, 255, 0.34) 72%,
    transparent 83% 100%
  );
  filter: blur(7px);
  opacity: 0.68;
  mix-blend-mode: screen;
  animation: liquid-sheen 8s cubic-bezier(0.45, 0, 0.25, 1) infinite;
}

.focus-liquid-bubble {
  z-index: 4;
  border: 1px solid rgba(255, 255, 255, 0.72);
  border-radius: 50%;
  background: radial-gradient(circle at 32% 26%, rgba(255, 255, 255, 0.88), rgba(255, 255, 255, 0.2) 34%, transparent 72%);
  box-shadow: 0 1px 4px rgba(255, 255, 255, 0.42) inset, 0 5px 12px rgba(102, 137, 193, 0.08);
  animation: liquid-bubble-float 7s ease-in-out infinite;
}

.focus-liquid-bubble-a {
  top: 25%;
  right: 23%;
  width: 1.1rem;
  aspect-ratio: 1;
}

.focus-liquid-bubble-b {
  bottom: 28%;
  left: 23%;
  width: 0.56rem;
  aspect-ratio: 1;
  animation-delay: -3.2s;
}

.focus-orb-highlight {
  z-index: 5;
  animation: liquid-highlight-drift 6.5s ease-in-out infinite;
}

.focus-orb-shade {
  z-index: 2;
  animation: liquid-shade-drift 9s ease-in-out infinite;
}

@keyframes focus-liquid-light {
  0%,
  100% { background-position: 0% 0%; }
  50% { background-position: 14% 9%; }
}

@keyframes liquid-orb-morph {
  0%,
  100% {
    border-radius: 42% 58% 61% 39% / 42% 43% 57% 58%;
    transform: translate3d(0, 0, 0) rotate(-12deg) scale(1);
  }
  25% {
    border-radius: 51% 49% 55% 45% / 44% 38% 62% 56%;
    transform: translate3d(3px, -4px, 0) rotate(-8deg) scale(1.015);
  }
  50% {
    border-radius: 58% 42% 46% 54% / 54% 44% 56% 46%;
    transform: translate3d(-2px, -8px, 0) rotate(-5deg) scale(1.025);
  }
  75% {
    border-radius: 45% 55% 39% 61% / 58% 52% 48% 42%;
    transform: translate3d(-4px, -3px, 0) rotate(-9deg) scale(1.01);
  }
}

@keyframes liquid-swell-a {
  0%,
  100% { transform: translate3d(-20%, -10%, 0) scale(0.74) rotate(-24deg); }
  50% { transform: translate3d(19%, 15%, 0) scale(1.28) rotate(27deg); }
}

@keyframes liquid-swell-b {
  0%,
  100% { transform: translate3d(18%, 13%, 0) scale(0.7) rotate(22deg); }
  50% { transform: translate3d(-21%, -15%, 0) scale(1.3) rotate(-26deg); }
}

@keyframes liquid-sheen {
  0%,
  100% { transform: translate3d(-12%, -8%, 0) rotate(-18deg) scale(0.9); opacity: 0.42; }
  50% { transform: translate3d(13%, 9%, 0) rotate(18deg) scale(1.08); opacity: 0.78; }
}

@keyframes liquid-bubble-float {
  0%,
  100% { transform: translate3d(0, 4px, 0) scale(0.92); opacity: 0.48; }
  50% { transform: translate3d(-5px, -8px, 0) scale(1.08); opacity: 0.86; }
}

@keyframes liquid-highlight-drift {
  0%,
  100% { transform: translate3d(0, 0, 0) rotate(-28deg) scale(1); opacity: 0.62; }
  50% { transform: translate3d(8px, 5px, 0) rotate(-18deg) scale(1.12); opacity: 0.88; }
}

@keyframes liquid-shade-drift {
  0%,
  100% { transform: translate3d(0, 0, 0) rotate(-24deg) scale(1); }
  50% { transform: translate3d(-7px, -4px, 0) rotate(-12deg) scale(1.14); }
}

@media (prefers-reduced-motion: reduce) {
  .focus-stage::before,
  .focus-glass-orb,
  .focus-liquid-swell,
  .focus-liquid-sheen,
  .focus-liquid-bubble,
  .focus-orb-highlight,
  .focus-orb-shade {
    animation: none;
  }
}

@media (prefers-reduced-transparency: reduce) {
  .focus-liquid-swell,
  .focus-liquid-sheen,
  .focus-liquid-bubble {
    display: none;
  }

  .focus-glass-orb {
    background: #edf3fc;
    box-shadow: 0 24px 48px rgba(99, 128, 177, 0.16);
  }
}
</style>
