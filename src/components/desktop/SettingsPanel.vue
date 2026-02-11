<template>
  <div class="settings-panel h-full w-full overflow-auto text-slate-800 dark:text-slate-100">
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
            <p class="text-xs text-slate-500 dark:text-slate-300">主题、图标和 Dock 显示</p>
          </div>
          <button class="settings-btn" @click="store.resetSettings()">恢复默认</button>
        </div>

        <div class="mt-4 grid gap-3 sm:grid-cols-2">
          <button
            class="toggle-row"
            :class="{ active: store.settings.darkMode }"
            @click="store.setDarkMode(!store.settings.darkMode)"
          >
            <span class="toggle-label">深色模式</span>
            <span class="toggle-value">{{ store.settings.darkMode ? '开' : '关' }}</span>
          </button>

          <button
            class="toggle-row"
            :class="{ active: store.settings.showDock }"
            @click="store.setShowDock(!store.settings.showDock)"
          >
            <span class="toggle-label">显示 Dock</span>
            <span class="toggle-value">{{ store.settings.showDock ? '显示' : '隐藏' }}</span>
          </button>
        </div>

        <div class="mt-5">
          <p class="mb-2 text-xs font-medium uppercase tracking-[0.16em] text-slate-500/90 dark:text-slate-300/90">图标尺寸</p>
          <div class="inline-flex rounded-xl bg-slate-900/5 p-1 dark:bg-white/10">
            <button
              v-for="size in iconSizeOptions"
              :key="size.id"
              class="segment-btn"
              :class="{ active: store.settings.iconSize === size.id }"
              @click="store.setIconSize(size.id)"
            >
              {{ size.label }}
            </button>
          </div>
        </div>

        <div class="mt-5 grid gap-3 sm:grid-cols-2">
          <div>
            <p class="mb-2 text-xs font-medium uppercase tracking-[0.16em] text-slate-500/90 dark:text-slate-300/90">动效强度</p>
            <div class="inline-flex rounded-xl bg-slate-900/5 p-1 dark:bg-white/10">
              <button
                v-for="item in motionOptions"
                :key="item.id"
                class="segment-btn"
                :class="{ active: store.settings.motionLevel === item.id }"
                @click="store.setMotionLevel(item.id)"
              >
                {{ item.label }}
              </button>
            </div>
          </div>

          <div>
            <p class="mb-2 text-xs font-medium uppercase tracking-[0.16em] text-slate-500/90 dark:text-slate-300/90">Dock 动画</p>
            <div class="inline-flex rounded-xl bg-slate-900/5 p-1 dark:bg-white/10">
              <button
                v-for="item in motionOptions"
                :key="`dock-${item.id}`"
                class="segment-btn"
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
            <span class="toggle-label">代码雨特效</span>
            <span class="toggle-value">{{ store.settings.codeRainEnabled ? '开启' : '关闭' }}</span>
          </button>
        </div>
      </section>

      <section class="settings-card lg:col-span-6">
        <h2 class="text-lg font-semibold">动态背景</h2>
        <p class="mt-1 text-xs text-slate-500 dark:text-slate-300">选择赛博背景风格</p>
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
        <p class="mt-1 text-xs text-slate-500 dark:text-slate-300">检测策略与状态统计</p>
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
            <p class="mb-2 text-xs font-medium uppercase tracking-[0.16em] text-slate-500/90 dark:text-slate-300/90">检测间隔</p>
            <div class="inline-flex rounded-xl bg-slate-900/5 p-1 dark:bg-white/10">
              <button
                v-for="item in monitorIntervalOptions"
                :key="item.id"
                class="segment-btn"
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
          <span class="status-badge status-online">在线 {{ store.serviceSummary.online }}</span>
          <span class="status-badge status-offline">离线 {{ store.serviceSummary.offline }}</span>
        </div>
      </section>

      <section class="settings-card lg:col-span-12">
        <h2 class="text-lg font-semibold">终端</h2>
        <p class="mt-1 text-xs text-slate-500 dark:text-slate-300">终端显示与命令行为</p>

        <div class="mt-4 grid gap-3 sm:grid-cols-3">
          <div class="sm:col-span-1">
            <p class="mb-2 text-xs font-medium uppercase tracking-[0.16em] text-slate-500/90 dark:text-slate-300/90">字体大小</p>
            <div class="inline-flex rounded-xl bg-slate-900/5 p-1 dark:bg-white/10">
              <button
                v-for="size in terminalFontOptions"
                :key="`font-${size.id}`"
                class="segment-btn"
                :class="{ active: store.settings.terminalFontSize === size.id }"
                @click="store.setTerminalFontSize(size.id)"
              >
                {{ size.label }}
              </button>
            </div>
          </div>

          <div class="sm:col-span-2">
            <p class="mb-2 text-xs font-medium uppercase tracking-[0.16em] text-slate-500/90 dark:text-slate-300/90">历史条数上限</p>
            <div class="inline-flex rounded-xl bg-slate-900/5 p-1 dark:bg-white/10">
              <button
                v-for="item in historyLimitOptions"
                :key="`hist-${item.id}`"
                class="segment-btn"
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
    label: '深网',
    preview: 'linear-gradient(135deg,#040912,#0e2c44)',
  },
  {
    id: 'neon-core',
    label: '霓虹',
    preview: 'linear-gradient(135deg,#17040f,#3c1332)',
  },
  {
    id: 'quantum-green',
    label: '量子',
    preview: 'linear-gradient(135deg,#04160d,#0f4b2f)',
  },
  {
    id: 'signal-amber',
    label: '信号',
    preview: 'linear-gradient(135deg,#180d03,#5a360f)',
  },
]

const virtualSystemInfo = computed(() => {
  const summary = store.serviceSummary
  const ratio = summary.total > 0 ? Math.round((summary.online / summary.total) * 100) : 0
  const lastChecked = store.lastStatusCheckAt
    ? new Date(store.lastStatusCheckAt).toLocaleTimeString('zh-CN', { hour12: false })
    : '--:--:--'

  return [
    { label: '系统版本', value: 'GML CyberOS 2.7.4-sim' },
    { label: '内核', value: 'gml-kernel 6.8.0-portal' },
    { label: '主机名', value: 'portal-node-a1' },
    { label: '运行时长', value: '7 days 03:12:49' },
    { label: '网络', value: 'eth0 · 192.168.50.23' },
    { label: '状态可用率', value: `${ratio}%` },
    { label: '在线服务', value: `${summary.online} / ${summary.total}` },
    { label: '离线服务', value: `${summary.offline}` },
    { label: '最后巡检', value: lastChecked },
  ]
})

const usage = computed(() => {
  const summary = store.serviceSummary
  const onlineFactor = summary.total > 0 ? summary.online / summary.total : 0.5

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
  border-radius: 16px;
  border: 1px solid rgba(148, 163, 184, 0.24);
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.72) 0%, rgba(248, 250, 252, 0.58) 100%);
  padding: 16px;
  backdrop-filter: blur(12px);
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
    border-radius: 14px;
    padding: 12px;
  }

  .settings-card .inline-flex {
    display: flex;
    width: 100%;
    flex-wrap: wrap;
  }

  .segment-btn {
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

.dark .settings-card {
  border-color: rgba(148, 163, 184, 0.2);
  background: linear-gradient(180deg, rgba(15, 23, 42, 0.66) 0%, rgba(2, 6, 23, 0.7) 100%);
}

.settings-btn {
  border-radius: 10px;
  border: 1px solid rgba(148, 163, 184, 0.28);
  background: rgba(15, 23, 42, 0.04);
  padding: 8px 12px;
  font-size: 12px;
  font-weight: 600;
  transition: all 150ms ease;
}

.settings-btn:hover {
  border-color: rgba(56, 189, 248, 0.45);
  background: rgba(56, 189, 248, 0.12);
}

.toggle-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-radius: 12px;
  border: 1px solid rgba(148, 163, 184, 0.3);
  background: rgba(148, 163, 184, 0.08);
  padding: 10px 12px;
  transition: all 150ms ease;
}

.toggle-row.active {
  border-color: rgba(56, 189, 248, 0.5);
  background: rgba(56, 189, 248, 0.16);
}

.toggle-label {
  font-size: 13px;
  font-weight: 600;
}

.toggle-value {
  font-size: 12px;
  color: rgb(51 65 85);
}

.dark .toggle-value {
  color: rgb(203 213 225);
}

.segment-btn {
  min-width: 58px;
  border-radius: 9px;
  padding: 6px 10px;
  font-size: 12px;
  font-weight: 600;
  color: rgb(71 85 105);
}

.segment-btn.active {
  background: rgba(56, 189, 248, 0.18);
  color: rgb(12 74 110);
}

.dark .segment-btn {
  color: rgb(203 213 225);
}

.dark .segment-btn.active {
  color: rgb(186 230 253);
}

.wallpaper-chip {
  position: relative;
  height: 68px;
  border-radius: 12px;
  border: 1px solid rgba(148, 163, 184, 0.32);
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
  transition: all 150ms ease;
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

.wallpaper-chip.active {
  border-color: rgba(56, 189, 248, 0.75);
  box-shadow: 0 0 0 1px rgba(56, 189, 248, 0.4) inset;
  transform: translateY(-1px);
}

.status-badge {
  border-radius: 999px;
  padding: 5px 10px;
  font-size: 11px;
  font-weight: 700;
}

.status-online {
  background: rgba(16, 185, 129, 0.2);
  color: rgb(6 95 70);
}

.status-offline {
  background: rgba(244, 63, 94, 0.2);
  color: rgb(159 18 57);
}

.dark .status-online {
  color: rgb(167 243 208);
}

.dark .status-offline {
  color: rgb(254 205 211);
}

.sys-card {
  border-radius: 12px;
  border: 1px solid rgba(148, 163, 184, 0.28);
  background: rgba(148, 163, 184, 0.08);
  padding: 10px 12px;
}

.sys-label {
  font-size: 11px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgb(100 116 139);
}

.sys-value {
  margin-top: 6px;
  font-size: 14px;
  font-weight: 700;
  color: rgb(15 23 42);
}

.dark .sys-card {
  border-color: rgba(148, 163, 184, 0.2);
  background: rgba(30, 41, 59, 0.4);
}

.dark .sys-label {
  color: rgb(148 163 184);
}

.dark .sys-value {
  color: rgb(226 232 240);
}

.sys-meter {
  border-radius: 12px;
  border: 1px solid rgba(148, 163, 184, 0.28);
  background: rgba(148, 163, 184, 0.08);
  padding: 10px 12px;
}

.sys-meter-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 12px;
  font-weight: 600;
  color: rgb(51 65 85);
}

.sys-bar {
  margin-top: 8px;
  width: 100%;
  height: 6px;
  border-radius: 999px;
  background: rgba(148, 163, 184, 0.25);
  overflow: hidden;
}

.sys-bar > span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, rgba(56, 189, 248, 0.9) 0%, rgba(14, 165, 233, 0.95) 100%);
}

.dark .sys-meter {
  border-color: rgba(148, 163, 184, 0.2);
  background: rgba(30, 41, 59, 0.4);
}

.dark .sys-meter-head {
  color: rgb(203 213 225);
}
</style>
