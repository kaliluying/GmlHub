<template>
  <div class="settings-panel" :class="{ 'settings-dark': store.settings.surfaceTheme === 'midnight' }">
    <aside class="settings-sidebar">
      <label class="settings-search">
        <IconGlyph name="search" :size="14" />
        <input v-model="searchQuery" type="search" placeholder="搜索" aria-label="搜索设置" />
      </label>

      <nav class="settings-nav" aria-label="设置分类">
        <button
          v-for="category in filteredCategories"
          :key="category.id"
          type="button"
          class="settings-nav-item"
          :class="{ active: activeCategory === category.id }"
          :aria-current="activeCategory === category.id ? 'page' : undefined"
          :aria-label="category.title"
          @click="activeCategory = category.id"
        >
          <span class="settings-nav-icon" :class="`tone-${category.id}`">
            <IconGlyph :name="category.icon" :size="16" />
          </span>
          <span>{{ category.title }}</span>
        </button>
        <p v-if="!filteredCategories.length" class="settings-no-results">没有找到相关设置</p>
      </nav>

      <button class="settings-reset" type="button" @click="store.resetSettings()">恢复默认设置</button>
    </aside>

    <main class="settings-main">
      <header class="settings-toolbar">
        <span>{{ activeCategoryInfo.title }}</span>
      </header>

      <div class="settings-scroll">
        <section v-if="activeCategory === 'general'" class="settings-page">
          <h1>通用</h1>
          <div class="settings-about-row">
            <span class="settings-about-icon"><span>G</span></span>
            <div><strong>GMLHUB</strong><small>个人桌面工作区</small></div>
            <span class="settings-version">网页桌面</span>
          </div>

          <SettingsGroup title="工作区">
            <SettingsRow title="信息密度" detail="调整桌面内容的留白">
              <div class="settings-segment">
                <button :class="{ selected: store.settings.layoutDensity === 'comfortable' }" :aria-pressed="store.settings.layoutDensity === 'comfortable'" @click="store.setLayoutDensity('comfortable')">舒适</button>
                <button :class="{ selected: store.settings.layoutDensity === 'compact' }" :aria-pressed="store.settings.layoutDensity === 'compact'" @click="store.setLayoutDensity('compact')">紧凑</button>
              </div>
            </SettingsRow>
            <SettingsRow title="动态效果" detail="控制桌面动画与过渡效果">
              <div class="settings-segment">
                <button v-for="item in motionOptions" :key="item.id" :class="{ selected: store.settings.motionLevel === item.id }" :aria-pressed="store.settings.motionLevel === item.id" @click="store.setMotionLevel(item.id)">{{ item.label }}</button>
              </div>
            </SettingsRow>
            <SettingsRow title="背景光影" detail="在桌面壁纸上显示柔和的动态光效">
              <SettingsSwitch :checked="store.settings.codeRainEnabled" label="背景光影" @change="store.setCodeRainEnabled" />
            </SettingsRow>
          </SettingsGroup>

          <SettingsGroup title="桌面状态">
            <SettingsRow title="工作区" detail="当前桌面空间"><span class="settings-value">Personal Space</span></SettingsRow>
            <SettingsRow title="服务可用率" detail="按最近一次服务巡检计算"><span class="settings-value">{{ availability }}%</span></SettingsRow>
          </SettingsGroup>
        </section>

        <section v-else-if="activeCategory === 'appearance'" class="settings-page">
          <h1>外观</h1>
          <p class="settings-lead">选择窗口、菜单和程序坞的外观。</p>
          <div class="settings-appearance-options" role="group" aria-label="外观模式">
            <button v-for="theme in themeOptions" :key="theme.id" :aria-pressed="store.settings.surfaceTheme === theme.id" :class="{ selected: store.settings.surfaceTheme === theme.id }" @click="store.setSurfaceTheme(theme.id)">
              <span class="settings-appearance-preview" :class="theme.id"><span /><span><i /><i /><i /></span></span>
              <span>{{ theme.label }}</span>
            </button>
          </div>
          <SettingsGroup title="桌面图标">
            <SettingsRow title="图标大小" detail="调整桌面应用图标的尺寸">
              <div class="settings-segment">
                <button v-for="item in iconSizeOptions" :key="item.id" :class="{ selected: store.settings.iconSize === item.id }" :aria-pressed="store.settings.iconSize === item.id" @click="store.setIconSize(item.id)">{{ item.label }}</button>
              </div>
            </SettingsRow>
            <SettingsRow title="服务摘要" detail="在菜单栏显示服务可用情况">
              <SettingsSwitch :checked="store.settings.showServiceReadout" label="服务摘要" @change="store.setShowServiceReadout" />
            </SettingsRow>
          </SettingsGroup>
        </section>

        <section v-else-if="activeCategory === 'wallpaper'" class="settings-page">
          <h1>墙纸</h1>
          <p class="settings-lead">为桌面选择一张墙纸。</p>
          <div class="wallpaper-grid">
            <button
              v-for="item in wallpaperOptions"
              :key="item.id"
              class="wallpaper-option"
              :class="{ selected: store.settings.wallpaper === item.id }"
              :style="{ backgroundImage: item.preview }"
              :aria-pressed="store.settings.wallpaper === item.id"
              @click="store.setWallpaper(item.id)"
            >
              <span class="wallpaper-check" aria-hidden="true">✓</span>
              <span class="wallpaper-name">{{ item.label }}</span>
            </button>
          </div>
        </section>

        <section v-else-if="activeCategory === 'dock'" class="settings-page">
          <h1>桌面与程序坞</h1>
          <p class="settings-lead">更改桌面和程序坞在屏幕上的显示方式。</p>
          <SettingsGroup title="程序坞">
            <SettingsRow title="显示程序坞" detail="在屏幕底部显示常用应用">
              <SettingsSwitch :checked="store.settings.showDock" label="显示程序坞" @change="store.setShowDock" />
            </SettingsRow>
            <SettingsRow title="大小" detail="同时调整桌面和程序坞图标">
              <div class="settings-slider">
                <input type="range" min="0" max="2" step="1" aria-label="程序坞大小" :aria-valuetext="iconSizeOptions.find(item => item.id === store.settings.iconSize)?.label" :value="iconSizeOptions.findIndex(item => item.id === store.settings.iconSize)" @input="store.setIconSize(iconSizeOptions[Number($event.target.value)].id)" />
                <span><small>小</small><small>大</small></span>
              </div>
            </SettingsRow>
            <SettingsRow title="放大效果" detail="指针移到程序坞时放大图标">
              <div class="settings-slider">
                <input type="range" min="0" max="2" step="1" aria-label="程序坞放大效果" :aria-valuetext="motionOptions.find(item => item.id === store.settings.dockAnimationLevel)?.label" :value="motionOptions.findIndex(item => item.id === store.settings.dockAnimationLevel)" @input="store.setDockAnimationLevel(motionOptions[Number($event.target.value)].id)" />
                <span><small>较小</small><small>较大</small></span>
              </div>
            </SettingsRow>
          </SettingsGroup>
        </section>

        <section v-else-if="activeCategory === 'service'" class="settings-page">
          <h1>服务状态</h1>
          <p class="settings-lead">配置自动巡检并查看当前服务状态。</p>
          <SettingsGroup title="巡检">
            <SettingsRow title="自动巡检" detail="定期检查已配置服务的可用状态">
              <SettingsSwitch :checked="store.settings.autoStartMonitoring" label="自动巡检" @change="store.setAutoStartMonitoring" />
            </SettingsRow>
            <SettingsRow title="检查间隔" detail="自动巡检的时间间隔">
              <div class="settings-segment">
                <button v-for="item in monitorIntervalOptions" :key="item.id" :class="{ selected: store.settings.statusMonitorIntervalMs === item.id }" :aria-pressed="store.settings.statusMonitorIntervalMs === item.id" @click="store.setStatusMonitorInterval(item.id)">{{ item.label }}</button>
              </div>
            </SettingsRow>
            <SettingsRow title="立即检查" detail="手动检查所有已配置服务">
              <button class="settings-action" :disabled="store.isMonitoringStatus" @click="store.checkServiceStatuses()">{{ store.isMonitoringStatus ? '正在检查…' : '现在检查' }}</button>
            </SettingsRow>
          </SettingsGroup>
          <SettingsGroup title="当前状态">
            <SettingsRow title="可访问" detail="正常响应的服务"><span class="settings-value">{{ store.serviceSummary.reachable }}</span></SettingsRow>
            <SettingsRow title="不可达" detail="当前无法访问的服务"><span class="settings-value">{{ store.serviceSummary.unreachable }}</span></SettingsRow>
            <SettingsRow title="待检查" detail="尚未取得检查结果的服务"><span class="settings-value">{{ store.serviceSummary.unknown }}</span></SettingsRow>
          </SettingsGroup>
        </section>

        <section v-else class="settings-page">
          <h1>终端</h1>
          <p class="settings-lead">自定终端的显示与命令历史。</p>
          <SettingsGroup title="显示">
            <SettingsRow title="字体大小" detail="调整终端中的文字大小">
              <div class="settings-segment">
                <button v-for="item in terminalFontOptions" :key="item.id" :class="{ selected: store.settings.terminalFontSize === item.id }" :aria-pressed="store.settings.terminalFontSize === item.id" @click="store.setTerminalFontSize(item.id)">{{ item.label }}</button>
              </div>
            </SettingsRow>
            <SettingsRow title="命令历史记录" detail="保留在终端中的历史命令数量">
              <div class="settings-segment">
                <button v-for="item in historyLimitOptions" :key="item.id" :class="{ selected: store.settings.terminalHistoryLimit === item.id }" :aria-pressed="store.settings.terminalHistoryLimit === item.id" @click="store.setTerminalHistoryLimit(item.id)">{{ item.label }}</button>
              </div>
            </SettingsRow>
            <SettingsRow title="终端彩蛋" detail="启用终端中的隐藏命令与提示">
              <SettingsSwitch :checked="store.settings.terminalEasterEggsEnabled" label="终端彩蛋" @change="store.setTerminalEasterEggsEnabled" />
            </SettingsRow>
          </SettingsGroup>
        </section>
      </div>
    </main>
  </div>
</template>

<script setup>
import { computed, defineComponent, h, ref } from 'vue'
import { useDesktopStore } from '../../stores/desktop.js'
import IconGlyph from './IconGlyph.vue'

const store = useDesktopStore()
const activeCategory = ref('general')
const searchQuery = ref('')

const categories = [
  { id: 'general', title: '通用', icon: 'settings', keywords: '信息密度 动态效果 动画 背景光影 工作区 服务可用率' },
  { id: 'appearance', title: '外观', icon: 'spark', keywords: '浅色 深色 主题 图标大小 服务摘要' },
  { id: 'wallpaper', title: '墙纸', icon: 'stack', keywords: '壁纸 流光 薄暮 薄荷 暖阳' },
  { id: 'dock', title: '桌面与程序坞', icon: 'tools', keywords: 'dock 大小 放大效果 显示程序坞' },
  { id: 'service', title: '服务状态', icon: 'activity', keywords: '巡检 检查间隔 立即检查 自动巡检' },
  { id: 'terminal', title: '终端', icon: 'terminal', keywords: '字体大小 命令历史记录 彩蛋' },
]
const activeCategoryInfo = computed(() => categories.find(item => item.id === activeCategory.value) || categories[0])
const filteredCategories = computed(() => {
  const query = searchQuery.value.trim().toLocaleLowerCase()
  return query ? categories.filter(item => `${item.title} ${item.keywords}`.toLocaleLowerCase().includes(query)) : categories
})
const availability = computed(() => {
  const { total, reachable } = store.serviceSummary
  return total ? Math.round((reachable / total) * 100) : 0
})

const iconSizeOptions = [
  { id: 'small', label: '小' },
  { id: 'medium', label: '中' },
  { id: 'large', label: '大' },
]
const themeOptions = [
  { id: 'studio', label: '浅色' },
  { id: 'midnight', label: '深色' },
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
  { id: 15000, label: '15 秒' },
  { id: 30000, label: '30 秒' },
  { id: 45000, label: '45 秒' },
  { id: 60000, label: '60 秒' },
]
const wallpaperOptions = [
  { id: 'deep-net', label: '流光', preview: "url('/wallpapers/gmlhub-aurora-ribbon.png')" },
  { id: 'neon-core', label: '薄暮', preview: 'linear-gradient(135deg,#d1c0ff,#6f6bc2 52%,#151c42)' },
  { id: 'quantum-green', label: '薄荷', preview: 'linear-gradient(135deg,#c7f4e3,#65b7a2 52%,#124b54)' },
  { id: 'signal-amber', label: '暖阳', preview: 'linear-gradient(135deg,#ffe7b1,#f19b60 52%,#6c3d50)' },
]

const SettingsGroup = defineComponent({
  props: { title: { type: String, required: true } },
  setup(props, { slots }) {
    return () => h('section', { class: 'settings-group' }, [
      h('h2', props.title),
      h('div', { class: 'settings-group-body' }, slots.default?.()),
    ])
  },
})

const SettingsRow = defineComponent({
  props: {
    title: { type: String, required: true },
    detail: { type: String, default: '' },
  },
  setup(props, { slots }) {
    return () => h('div', { class: 'settings-row', role: 'group', 'aria-label': props.title }, [
      h('div', { class: 'settings-row-copy' }, [
        h('span', { class: 'settings-row-title' }, props.title),
        props.detail && h('span', { class: 'settings-row-detail' }, props.detail),
      ]),
      h('div', { class: 'settings-row-control' }, slots.default?.()),
    ])
  },
})

const SettingsSwitch = defineComponent({
  props: {
    checked: { type: Boolean, required: true },
    label: { type: String, required: true },
  },
  emits: ['change'],
  setup(props, { emit }) {
    return () => h('button', {
      type: 'button',
      role: 'switch',
      class: ['settings-switch', { on: props.checked }],
      'aria-checked': String(props.checked),
      'aria-label': props.label,
      onClick: () => emit('change', !props.checked),
    }, [h('span')])
  },
})
</script>

<style>
.settings-panel {
  --settings-blue: #087cff;
  --settings-text: #1d1d1f;
  --settings-secondary: #68686d;
  --settings-background: #f5f5f7;
  --settings-sidebar: rgba(232, 232, 235, 0.96);
  --settings-card: #fff;
  --settings-control: #e6e6e9;
  --settings-selected: #fff;
  --settings-line: rgba(60, 60, 67, 0.14);
  display: flex;
  width: 100%;
  height: 100%;
  overflow: hidden;
  color: var(--settings-text);
  background: var(--settings-background);
  font: 13px/1.45 -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'PingFang SC', sans-serif;
}

.settings-sidebar {
  display: flex;
  flex: 0 0 218px;
  flex-direction: column;
  min-width: 0;
  padding: 52px 12px 12px;
  border-right: 1px solid rgba(0, 0, 0, 0.09);
  background: var(--settings-sidebar);
  -webkit-backdrop-filter: blur(24px);
  backdrop-filter: blur(24px);
}

.settings-search { display: flex; flex-shrink: 0; align-items: center; gap: 6px; min-height: 29px; padding: 0 8px; border: 1px solid rgba(60, 60, 67, 0.13); border-radius: 7px; background: rgba(255, 255, 255, 0.68); color: #8b8b90; }
.settings-search input { width: 100%; min-width: 0; padding: 0; border: 0; outline: 0; background: transparent; color: var(--settings-text); font: inherit; }
.settings-search input::placeholder { color: #85858a; }
.settings-nav { display: grid; flex: 1; min-height: 0; overflow-y: auto; align-content: start; gap: 2px; margin-top: 16px; }
.settings-nav-item { display: flex; align-items: center; gap: 9px; min-height: 36px; padding: 4px 8px; border: 0; border-radius: 7px; background: transparent; color: var(--settings-text); text-align: left; font: inherit; cursor: default; }
.settings-nav-item:hover { background: rgba(60, 60, 67, 0.07); }
.settings-nav-item.active { background: var(--settings-blue); color: #fff; }
.settings-nav-icon { display: grid; width: 23px; height: 23px; flex: 0 0 23px; place-items: center; border-radius: 6px; color: #fff; box-shadow: 0 1px 1px rgba(0, 0, 0, 0.12) inset; }
.tone-general { background: linear-gradient(145deg, #a8abb2, #6b7079); }
.tone-appearance { background: linear-gradient(145deg, #f49b63, #db4d7c); }
.tone-wallpaper { background: linear-gradient(145deg, #4cb6ef, #576bd5); }
.tone-dock { background: linear-gradient(145deg, #a294f4, #7160d5); }
.tone-service { background: linear-gradient(145deg, #68ca9b, #28996f); }
.tone-terminal { background: linear-gradient(145deg, #737a88, #3e434d); }
.settings-no-results { margin: 8px; color: var(--settings-secondary); font-size: 12px; }
.settings-reset { flex-shrink: 0; margin: auto 7px 0; padding: 9px 0 0; border: 0; border-top: 1px solid var(--settings-line); background: transparent; color: var(--settings-blue); text-align: left; font: inherit; cursor: default; }

.settings-main { display: flex; flex: 1; flex-direction: column; min-width: 0; min-height: 0; }
.settings-toolbar { display: flex; align-items: center; justify-content: flex-start; padding: 0 26px; height: 52px; flex: 0 0 52px; border-bottom: 1px solid var(--settings-line); background: var(--settings-background); font-size: 13px; font-weight: 600; }
.settings-scroll { flex: 1; min-height: 0; overflow: auto; overscroll-behavior: contain; }
.settings-page { max-width: 680px; margin: 0 auto; padding: 24px 26px 34px; }
.settings-page > h1 { margin: 0 0 5px; font-size: 25px; line-height: 1.2; font-weight: 700; letter-spacing: -0.04em; }
.settings-lead { margin: 0 0 23px; color: var(--settings-secondary); font-size: 12px; }
.settings-about-row { display: flex; align-items: center; gap: 12px; margin: 15px 0 25px; padding: 14px 15px; border: 1px solid var(--settings-line); border-radius: 11px; background: var(--settings-card); }
.settings-about-icon { display: grid; width: 44px; height: 44px; place-items: center; border-radius: 10px; background: linear-gradient(145deg, #202e54, #647eaf); color: #fff; font-size: 23px; font-weight: 700; box-shadow: 0 1px 1px rgba(255, 255, 255, 0.45) inset; }
.settings-about-row strong,.settings-about-row small { display: block; }
.settings-about-row strong { font-size: 14px; }
.settings-about-row small { margin-top: 2px; color: var(--settings-secondary); font-size: 11px; }
.settings-version { margin-left: auto; color: var(--settings-secondary); font-size: 11px; }
.settings-group { margin-top: 22px; }
.settings-group h2 { margin: 0 0 7px 2px; color: var(--settings-secondary); font-size: 12px; font-weight: 500; }
.settings-group-body { overflow: hidden; border: 1px solid var(--settings-line); border-radius: 10px; background: var(--settings-card); }
.settings-row { display: flex; align-items: center; justify-content: space-between; gap: 16px; min-height: 53px; padding: 9px 13px; }
.settings-row + .settings-row { border-top: 1px solid var(--settings-line); }
.settings-row-copy { display: grid; gap: 2px; min-width: 0; }
.settings-row-title { font-size: 12px; font-weight: 500; }
.settings-row-detail { color: var(--settings-secondary); font-size: 10px; }
.settings-row-control { display: flex; flex: 0 0 auto; align-items: center; justify-content: flex-end; }
.settings-value { color: var(--settings-secondary); font-size: 12px; }
.settings-segment { display: inline-flex; gap: 1px; padding: 2px; border: 1px solid rgba(60, 60, 67, 0.12); border-radius: 7px; background: var(--settings-control); }
.settings-segment button { min-width: 37px; padding: 4px 7px; border: 0; border-radius: 5px; background: transparent; color: var(--settings-text); font: inherit; font-size: 10px; white-space: nowrap; cursor: default; }
.settings-segment button.selected { background: var(--settings-selected); box-shadow: 0 1px 3px rgba(0, 0, 0, 0.18); color: var(--settings-text); }
.settings-switch { position: relative; width: 34px; height: 20px; padding: 0; border: 0; border-radius: 11px; background: #d1d1d6; transition: background 160ms ease; cursor: default; }
.settings-switch.on { background: #34c759; }
.settings-switch span { position: absolute; top: 2px; left: 2px; width: 16px; height: 16px; border-radius: 50%; background: var(--settings-card); box-shadow: 0 1px 2px rgba(0, 0, 0, 0.24); transition: transform 160ms ease; }
.settings-switch.on span { transform: translateX(14px); }
.settings-action { padding: 6px 11px; border: 0; border-radius: 6px; background: var(--settings-control); color: var(--settings-text); font: inherit; font-size: 11px; cursor: default; }
.settings-action:hover { background: #dedee2; }
.settings-action:disabled { color: #85858a; cursor: wait; }
.wallpaper-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 13px; margin-top: 18px; }
.wallpaper-option { position: relative; min-width: 0; aspect-ratio: 1.45; overflow: hidden; border: 2px solid transparent; border-radius: 10px; background-position: center; background-size: cover; box-shadow: 0 2px 7px rgba(20, 28, 44, 0.16); cursor: default; }
.wallpaper-option.selected { border-color: var(--settings-blue); box-shadow: 0 0 0 2px rgba(8, 124, 255, 0.17); }
.wallpaper-name { position: absolute; right: 0; bottom: 0; left: 0; padding: 17px 9px 7px; background: linear-gradient(transparent, rgba(0, 0, 0, 0.55)); color: #fff; text-align: left; font-size: 11px; }
.wallpaper-check { position: absolute; top: 7px; right: 7px; display: none; width: 19px; height: 19px; border-radius: 50%; background: var(--settings-blue); color: #fff; line-height: 19px; text-align: center; font-size: 12px; }
.wallpaper-option.selected .wallpaper-check { display: block; }

.settings-panel button:focus-visible, .settings-panel input:focus-visible { outline: 2px solid var(--settings-blue); outline-offset: 2px; }
@container desktop-window (max-width: 620px) {
  .settings-panel { flex-direction: column; padding-top: 44px; }
  .settings-sidebar { flex: 0 0 auto; padding: 8px 10px; border-right: 0; border-bottom: 1px solid var(--settings-line); }
  .settings-nav { display: flex; flex: 0 0 auto; gap: 4px; margin-top: 8px; overflow-x: auto; }
  .settings-nav-item { flex: 0 0 auto; min-height: 34px; padding: 4px 7px; gap: 5px; font-size: 11px; }
  .settings-nav-icon { width: 21px; height: 21px; flex-basis: 21px; }
  .settings-reset { margin: 8px 4px 0; padding-top: 5px; font-size: 11px; }
  .settings-toolbar { height: 40px; flex-basis: 40px; padding-inline: 16px; }
  .settings-page { padding: 16px 14px 24px; }
  .settings-row { align-items: flex-start; flex-direction: column; gap: 8px; }
  .settings-row-control { justify-content: flex-start; max-width: 100%; }
  .settings-segment { max-width: 100%; }
  .settings-segment button { min-width: 31px; padding-inline: 5px; }
}
@media (prefers-reduced-motion: reduce) {
  .settings-switch,.settings-switch span { transition: none; }
}

.settings-appearance-options { display: flex; gap: 22px; margin: 22px 0 28px; }
.settings-appearance-options button { display: grid; gap: 7px; padding: 0; border: 0; background: transparent; color: var(--settings-text); text-align: center; font: inherit; font-size: 12px; }
.settings-appearance-preview { display: flex; width: 132px; height: 83px; padding: 12px 13px; overflow: hidden; border: 3px solid transparent; border-radius: 9px; background: linear-gradient(145deg, #a8d6f1, #557cc4); background-clip: padding-box; }
.settings-appearance-preview > span:first-child { width: 29px; border-radius: 4px 0 0 4px; background: #e9e9edde; }
.settings-appearance-preview > span:last-child { display: grid; flex: 1; gap: 5px; padding: 12px 6px; border-radius: 0 4px 4px 0; background: #fafafa; }
.settings-appearance-preview i { border-radius: 2px; background: #e2e2e6; }
.settings-appearance-preview.midnight > span:first-child { background: #33333bde; }
.settings-appearance-preview.midnight > span:last-child { background: #232328; }
.settings-appearance-preview.midnight i { background: #494951; }
.settings-appearance-options .selected .settings-appearance-preview { border-color: var(--settings-blue); }
.settings-slider { width: 180px; }
.settings-slider input { display: block; width: 100%; margin: 0; accent-color: var(--settings-blue); }
.settings-slider > span { display: flex; justify-content: space-between; margin-top: 4px; color: var(--settings-secondary); }
.settings-slider small { font-size: 10px; }
.settings-dark { --settings-text: #eeeef0; --settings-secondary: #ababaf; --settings-line: #ffffff19; --settings-background: #202023; --settings-sidebar: #2b2b2e; --settings-card: #2c2c2f; --settings-control: #3a3a3d; --settings-selected: #626268; }
.settings-dark .settings-search { background: #ffffff0c; border-color: #ffffff0d; }
.settings-dark .settings-switch:not(.on) { background: #5b5b60; }
.settings-dark .settings-switch span { background: #fff; }
.settings-dark .settings-action:hover { background: #55555b; }
</style>
