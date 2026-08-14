<template>
<div class="settings-panel h-full w-full overflow-auto text-hud-text">
    <div class="settings-shell">
      <section class="settings-card lg:col-span-12">
        <h2 class="text-lg font-semibold">系统信息</h2>

        <div class="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <article class="sys-card" v-for="item in virtualSystemInfo" :key="item.label">
            <p class="sys-label">{{ item.label }}</p>
            <p class="sys-value">{{ item.value }}</p>
          </article>
        </div>

        <div class="mt-4 grid gap-3 sm:grid-cols-3">
          <article class="sys-meter">
            <div class="sys-meter-head">
              <span>CPU 负载</span>
              <span>{{ usage.cpu }}%</span>
            </div>
            <div class="sys-bar"><span :style="{ width: `${usage.cpu}%` }" /></div>
          </article>
          <article class="sys-meter">
            <div class="sys-meter-head">
              <span>内存占用</span>
              <span>{{ usage.memory }}%</span>
            </div>
            <div class="sys-bar"><span :style="{ width: `${usage.memory}%` }" /></div>
          </article>
          <article class="sys-meter">
            <div class="sys-meter-head">
              <span>磁盘使用</span>
              <span>{{ usage.disk }}%</span>
            </div>
            <div class="sys-bar"><span :style="{ width: `${usage.disk}%` }" /></div>
          </article>
        </div>
      </section>

      <section class="settings-card lg:col-span-6">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 class="text-lg font-semibold">外观</h2>
            <p class="text-xs text-hud-muted">图标尺寸、Dock、动效与信息显示</p>
          </div>
          <button class="settings-btn" @click="store.resetSettings()">恢复默认</button>
        </div>

        <div class="mt-4 grid gap-3">
          <button
            class="toggle-row"
            :class="{ active: store.settings.showDock }"
            @click="store.setShowDock(!store.settings.showDock)"
          >
            <span class="toggle-label">显示 Dock</span>
            <span class="toggle-value">{{ store.settings.showDock ? '显示' : '隐藏' }}</span>
          </button>
          <button
            class="toggle-row"
            :class="{ active: store.settings.showServiceReadout }"
            @click="store.setShowServiceReadout(!store.settings.showServiceReadout)"
          >
            <span class="toggle-label">显示服务摘要</span>
            <span class="toggle-value">{{ store.settings.showServiceReadout ? '显示' : '隐藏' }}</span>
          </button>
        </div>

        <div class="mt-5">
          <p class="mb-2 text-xs font-medium uppercase tracking-[0.16em] text-hud-muted">图标尺寸</p>
          <div class="hud-segment">
            <button
              v-for="size in iconSizeOptions"
              :key="size.id"
              class="hud-segment-btn"
              :class="{ active: store.settings.iconSize === size.id }"
              @click="store.setIconSize(size.id)"
            >
              {{ size.label }}
            </button>
          </div>
        </div>

        <div class="mt-5 grid gap-3 sm:grid-cols-2">
          <div>
            <p class="mb-2 text-xs font-medium uppercase tracking-[0.16em] text-hud-muted">动效强度</p>
            <div class="hud-segment">
              <button
                v-for="item in motionOptions"
                :key="item.id"
                class="hud-segment-btn"
                :class="{ active: store.settings.motionLevel === item.id }"
                @click="store.setMotionLevel(item.id)"
              >
                {{ item.label }}
              </button>
            </div>
          </div>

          <div>
            <p class="mb-2 text-xs font-medium uppercase tracking-[0.16em] text-hud-muted">Dock 动画</p>
            <div class="hud-segment">
              <button
                v-for="item in motionOptions"
                :key="`dock-${item.id}`"
                class="hud-segment-btn"
                :class="{ active: store.settings.dockAnimationLevel === item.id }"
                @click="store.setDockAnimationLevel(item.id)"
              >
                {{ item.label }}
              </button>
            </div>
          </div>
        </div>

        <div class="mt-3">
          <button
            class="toggle-row"
            :class="{ active: store.settings.codeRainEnabled }"
            @click="store.setCodeRainEnabled(!store.settings.codeRainEnabled)"
          >
            <span class="toggle-label">背景光影</span>
            <span class="toggle-value">{{ store.settings.codeRainEnabled ? '开启' : '关闭' }}</span>
          </button>
        </div>
      </section>

      <section class="settings-card lg:col-span-6">
        <h2 class="text-lg font-semibold">动态背景</h2>
        <p class="mt-1 text-xs text-hud-muted">选择一组柔和的桌面色彩</p>
        <div class="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <button
            v-for="item in wallpaperOptions"
            :key="item.id"
            class="wallpaper-chip"
            :class="{ active: store.settings.wallpaper === item.id }"
            :style="{ backgroundImage: item.preview }"
            @click="store.setWallpaper(item.id)"
          >
            <span>{{ item.label }}</span>
          </button>
        </div>
      </section>

      <section class="settings-card lg:col-span-12">
        <h2 class="text-lg font-semibold">服务状态</h2>
        <p class="mt-1 text-xs text-hud-muted">检测策略与状态统计</p>
        <div class="mt-4 grid gap-3 sm:grid-cols-2">
          <button
            class="toggle-row"
            :class="{ active: store.settings.autoStartMonitoring }"
            @click="store.setAutoStartMonitoring(!store.settings.autoStartMonitoring)"
          >
            <span class="toggle-label">自动巡检</span>
            <span class="toggle-value">{{ store.settings.autoStartMonitoring ? '启用' : '停用' }}</span>
          </button>

          <div>
          <p class="mb-2 text-xs font-medium uppercase tracking-[0.16em] text-hud-muted">检测间隔</p>
          <div class="hud-segment">
              <button
                v-for="item in monitorIntervalOptions"
                :key="item.id"
                class="hud-segment-btn"
                :class="{ active: store.settings.statusMonitorIntervalMs === item.id }"
                @click="store.setStatusMonitorInterval(item.id)"
              >
                {{ item.label }}
              </button>
            </div>
          </div>
        </div>
        <div class="mt-4 flex flex-wrap items-center gap-3">
          <button class="settings-btn" @click="store.checkServiceStatuses()">
            {{ store.isMonitoringStatus ? '检测中...' : '立即检测' }}
          </button>
          <span class="status-badge status-reachable">可访问 {{ store.serviceSummary.reachable }}</span>
          <span class="status-badge status-unreachable">不可达 {{ store.serviceSummary.unreachable }}</span>
          <span class="status-badge status-unknown">待检查 {{ store.serviceSummary.unknown }}</span>
        </div>
      </section>

      <section class="settings-card lg:col-span-12">
        <h2 class="text-lg font-semibold">终端</h2>
        <p class="mt-1 text-xs text-hud-muted">终端显示与命令行为</p>

        <div class="mt-4 grid gap-3 sm:grid-cols-3">
          <div class="sm:col-span-1">
          <p class="mb-2 text-xs font-medium uppercase tracking-[0.16em] text-hud-muted">字体大小</p>
          <div class="hud-segment">
              <button
                v-for="size in terminalFontOptions"
                :key="`font-${size.id}`"
                class="hud-segment-btn"
                :class="{ active: store.settings.terminalFontSize === size.id }"
                @click="store.setTerminalFontSize(size.id)"
              >
                {{ size.label }}
              </button>
            </div>
          </div>

          <div class="sm:col-span-2">
          <p class="mb-2 text-xs font-medium uppercase tracking-[0.16em] text-hud-muted">历史条数上限</p>
          <div class="hud-segment">
              <button
                v-for="item in historyLimitOptions"
                :key="`hist-${item.id}`"
                class="hud-segment-btn"
                :class="{ active: store.settings.terminalHistoryLimit === item.id }"
                @click="store.setTerminalHistoryLimit(item.id)"
              >
                {{ item.label }}
              </button>
            </div>
          </div>
        </div>

        <div class="mt-3">
          <button
            class="toggle-row"
            :class="{ active: store.settings.terminalEasterEggsEnabled }"
            @click="store.setTerminalEasterEggsEnabled(!store.settings.terminalEasterEggsEnabled)"
          >
            <span class="toggle-label">终端彩蛋</span>
            <span class="toggle-value">{{ store.settings.terminalEasterEggsEnabled ? '启用' : '禁用' }}</span>
          </button>
        </div>
      </section>

    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useDesktopStore } from '../../stores/desktop.js'

const store = useDesktopStore()

const iconSizeOptions = [
  { id: 'small', label: '小' },
  { id: 'medium', label: '中' },
  { id: 'large', label: '大' },
]

const motionOptions = [
  { id: 'low', label: '低' },
  { id: 'medium', label: '中' },
  { id: 'high', label: '高' },
]

const terminalFontOptions = [
  { id: 'small', label: '小' },
  { id: 'medium', label: '中' },
  { id: 'large', label: '大' },
]

const historyLimitOptions = [
  { id: 30, label: '30' },
  { id: 100, label: '100' },
  { id: 300, label: '300' },
]

const monitorIntervalOptions = [
  { id: 15000, label: '15s' },
  { id: 30000, label: '30s' },
  { id: 45000, label: '45s' },
  { id: 60000, label: '60s' },
]

const wallpaperOptions = [
  {
    id: 'deep-net',
    label: '晨雾',
    preview: 'linear-gradient(135deg,#eaf2ff,#c7dcff)',
  },
  {
    id: 'neon-core',
    label: '薄暮',
    preview: 'linear-gradient(135deg,#f3e9ff,#d9c8f4)',
  },
  {
    id: 'quantum-green',
    label: '薄荷',
    preview: 'linear-gradient(135deg,#e4f8f1,#bde8d7)',
  },
  {
    id: 'signal-amber',
    label: '暖阳',
    preview: 'linear-gradient(135deg,#fff1d8,#f5c98d)',
  },
]

const virtualSystemInfo = computed(() => {
  const summary = store.serviceSummary
  const ratio = summary.total > 0 ? Math.round((summary.reachable / summary.total) * 100) : 0
  const lastChecked = store.lastStatusCheckAt
    ? new Date(store.lastStatusCheckAt).toLocaleTimeString('zh-CN', { hour12: false })
    : '--:--:--'

  return [
    { label: '系统版本', value: 'GMLHub Desktop 2.7' },
    { label: '运行环境', value: 'GMLHub Workspace' },
    { label: '工作区', value: 'Personal Space' },
    { label: '运行时长', value: '7 days 03:12:49' },
    { label: '网络', value: 'eth0 · 192.168.50.23' },
    { label: '状态可用率', value: `${ratio}%` },
    { label: '可访问服务', value: `${summary.reachable} / ${summary.total}` },
    { label: '不可达服务', value: `${summary.unreachable}` },
    { label: '待检查服务', value: `${summary.unknown}` },
    { label: '最后巡检', value: lastChecked },
  ]
})

const usage = computed(() => {
  const summary = store.serviceSummary
  const onlineFactor = summary.total > 0 ? summary.reachable / summary.total : 0.5

  return {
    cpu: Math.min(92, Math.max(18, Math.round(28 + onlineFactor * 34))),
    memory: Math.min(90, Math.max(25, Math.round(42 + onlineFactor * 26))),
    disk: 39,
  }
})
</script>

<style scoped>
.settings-card {
  width: 100%;
  box-sizing: border-box;
  border-radius: var(--radius-card);
  border: 1px solid var(--hud-line);
  background: linear-gradient(
    162deg,
    rgba(20, 31, 52, 0.52) 0%,
    var(--hud-panel-soft) 100%
  );
  padding: 16px;
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  box-shadow: var(--shadow-card), 0 1px 0 rgba(255, 255, 255, 0.06) inset;
}

.settings-shell {
  display: grid;
  gap: 14px;
  padding: 14px;
}

@media (max-width: 767px) {
  .settings-shell {
    gap: 10px;
    padding: 10px;
  }

  .settings-card {
    border-radius: 12px;
    padding: 12px;
  }

  .settings-card .hud-segment {
    display: flex;
    width: 100%;
    flex-wrap: wrap;
  }

  .hud-segment-btn {
    flex: 1 1 auto;
    min-width: 0;
  }

  .wallpaper-chip {
    height: 58px;
  }
}

@media (min-width: 1024px) {
  .settings-shell {
    grid-template-columns: repeat(12, minmax(0, 1fr));
    gap: 16px;
    padding: 16px;
  }
}

.settings-btn {
  border-radius: var(--radius-inner);
  border: 1px solid var(--hud-line-strong);
  background: rgba(15, 23, 42, 0.4);
  padding: 8px 13px;
  font-size: 12px;
  font-weight: 600;
  color: rgb(226 232 240);
  transition: all 0.2s var(--ease-hud);
}

.settings-btn:hover {
  border-color: var(--hud-primary-border);
  background: var(--hud-primary-faint);
  color: var(--hud-text);
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(2, 6, 23, 0.35);
}

.settings-btn:active {
  transform: translateY(0);
  box-shadow: none;
}

.toggle-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-radius: 12px;
  border: 1px solid var(--hud-line);
  background: rgba(15, 23, 42, 0.36);
  padding: 10px 13px;
  transition: all 0.2s var(--ease-hud);
}

.toggle-row:hover {
  border-color: rgba(125, 211, 252, 0.26);
  background: rgba(22, 34, 56, 0.46);
}

.toggle-row.active {
  border-color: rgba(125, 211, 252, 0.44);
  background: linear-gradient(180deg, rgba(56, 189, 248, 0.16), rgba(56, 189, 248, 0.08));
}

.toggle-label {
  font-size: 13px;
  font-weight: 600;
}

.toggle-value {
  font-size: 12px;
  color: var(--hud-muted);
}

.wallpaper-chip {
  position: relative;
  height: 68px;
  border-radius: 12px;
  border: 1px solid var(--hud-line-strong);
  background-size: cover;
  background-position: center;
  display: flex;
  align-items: flex-end;
  padding: 8px;
  text-align: left;
  color: rgb(241 245 249);
  font-size: 12px;
  font-weight: 700;
  text-shadow: 0 1px 10px rgba(15, 23, 42, 0.7);
  overflow: hidden;
  transition: all 0.22s var(--ease-hud);
}

.wallpaper-chip::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: linear-gradient(180deg, rgba(2, 6, 23, 0.1) 0%, rgba(2, 6, 23, 0.5) 100%);
}

.wallpaper-chip > span {
  position: relative;
  z-index: 1;
}

.wallpaper-chip:hover {
  border-color: rgba(125, 211, 252, 0.5);
  transform: translateY(-1px);
  box-shadow: 0 10px 24px rgba(2, 6, 23, 0.4);
}

.wallpaper-chip.active {
  border-color: rgba(125, 211, 252, 0.75);
  box-shadow:
    0 0 0 1px rgba(125, 211, 252, 0.4) inset,
    0 0 22px rgba(56, 189, 248, 0.18);
  transform: translateY(-1px);
}

.status-badge {
  border-radius: 999px;
  padding: 5px 10px;
  font-size: 11px;
  font-weight: 700;
}

.status-reachable {
  background: rgba(16, 185, 129, 0.2);
  color: rgb(167 243 208);
}

.status-unreachable {
  background: rgba(244, 63, 94, 0.2);
  color: rgb(254 205 211);
}

.status-unknown {
  background: rgba(100, 116, 139, 0.2);
  color: rgb(226 232 240);
}

.sys-card {
  border-radius: 12px;
  border: 1px solid rgba(125, 211, 252, 0.12);
  background: rgba(8, 14, 26, 0.5);
  padding: 10px 12px;
  transition: all 0.22s var(--ease-hud);
}

.sys-card:hover {
  border-color: rgba(125, 211, 252, 0.3);
  background: rgba(17, 30, 52, 0.6);
  transform: translateY(-1px);
}

.sys-label {
  font-size: 11px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--hud-muted);
}

.sys-value {
  margin-top: 6px;
  font-size: 14px;
  font-weight: 700;
  color: var(--hud-text);
}

.sys-meter {
  border-radius: 12px;
  border: 1px solid rgba(125, 211, 252, 0.12);
  background: rgba(8, 14, 26, 0.5);
  padding: 10px 12px;
  transition: all 0.22s var(--ease-hud);
}

.sys-meter:hover {
  border-color: rgba(125, 211, 252, 0.3);
  background: rgba(17, 30, 52, 0.6);
}

.sys-meter-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 12px;
  font-weight: 600;
  color: var(--hud-text);
}

.sys-bar {
  margin-top: 8px;
  width: 100%;
  height: 6px;
  border-radius: 999px;
  background: rgba(125, 211, 252, 0.14);
  overflow: hidden;
}

.sys-bar > span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, rgba(56, 189, 248, 0.9) 0%, rgba(14, 165, 233, 0.95) 100%);
  box-shadow: 0 0 10px rgba(56, 189, 248, 0.45);
  transition: width 0.6s var(--ease-hud);
}

/* Liquid glass settings */
.settings-panel {
  color: #182235;
}

.settings-card {
  border-color: rgba(255, 255, 255, 0.74);
  border-radius: 1.35rem;
  background: rgba(255, 255, 255, 0.48);
  box-shadow: 0 20px 48px rgba(100, 119, 148, 0.12), 0 2px 0 rgba(255, 255, 255, 0.72) inset;
  backdrop-filter: blur(22px) saturate(140%);
  -webkit-backdrop-filter: blur(22px) saturate(140%);
}

.settings-btn,
.toggle-row,
.sys-card,
.sys-meter {
  border-color: rgba(116, 133, 158, 0.16);
  background: rgba(255, 255, 255, 0.38);
  color: #344056;
  box-shadow: 0 1px 0 rgba(255, 255, 255, 0.58) inset;
}

.settings-btn:hover,
.toggle-row:hover,
.sys-card:hover,
.sys-meter:hover {
  border-color: rgba(91, 131, 206, 0.32);
  background: rgba(255, 255, 255, 0.66);
  color: #243452;
  box-shadow: 0 10px 20px rgba(91, 131, 206, 0.1), 0 1px 0 rgba(255, 255, 255, 0.68) inset;
}

.toggle-row.active {
  border-color: rgba(91, 131, 206, 0.34);
  background: linear-gradient(180deg, rgba(220, 232, 255, 0.8), rgba(203, 220, 251, 0.56));
}

.toggle-value,
.sys-label {
  color: #77849a;
}

.sys-value,
.sys-meter-head {
  color: #26334a;
}

.wallpaper-chip {
  border-color: rgba(255, 255, 255, 0.74);
  color: #26334a;
  text-shadow: none;
  box-shadow: 0 10px 22px rgba(100, 119, 148, 0.12), 0 1px 0 rgba(255, 255, 255, 0.7) inset;
}

.wallpaper-chip::before {
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.02), rgba(255, 255, 255, 0.22));
}

.wallpaper-chip:hover,
.wallpaper-chip.active {
  border-color: rgba(91, 131, 206, 0.48);
  box-shadow: 0 0 0 2px rgba(91, 131, 206, 0.1) inset, 0 12px 24px rgba(91, 131, 206, 0.14);
}

.status-reachable {
  background: rgba(75, 177, 139, 0.14);
  color: #278d6a;
}

.status-unreachable {
  background: rgba(200, 94, 109, 0.13);
  color: #b65060;
}

.status-unknown {
  background: rgba(116, 133, 158, 0.14);
  color: #69768a;
}

.sys-bar {
  background: rgba(116, 133, 158, 0.14);
}

.sys-bar > span {
  background: linear-gradient(90deg, #8eb8ff, #6389d7);
  box-shadow: none;
}

@media (prefers-reduced-transparency: reduce) {
  .settings-card,
  .settings-btn,
  .toggle-row,
  .sys-card,
  .sys-meter {
    background: #f8fafc;
    backdrop-filter: none;
    -webkit-backdrop-filter: none;
  }
}

</style>
