<template>
  <div
    v-show="!window.minimized"
    ref="windowRef"
    class="window absolute flex flex-col rounded-2xl overflow-hidden window-shadow transition-shadow"
    :class="{ 'window-focused': window.focused, 'window-mobile-panel': isMobilePanel, 'window-settings': window.appId === 'settings', 'window-dark': store.settings.surfaceTheme === 'midnight' }"
    :style="windowStyle"
    role="dialog"
    :aria-label="window.title"
    :aria-modal="false"
    @pointerdown="handlePointerDown"
  >
    <!-- 标题栏 -->
    <div
      class="title-bar h-11 flex items-center justify-between px-4 glass-strong cursor-default"
      @pointerdown.stop="startDrag"
    >
      <div class="flex items-center gap-2">
        <button
          type="button"
          class="window-close-control rounded-full bg-red-400 hover:bg-red-500"
          @pointerdown.stop
          @click.stop="close"
          title="关闭"
          aria-label="关闭窗口"
        />
        <button
          type="button"
          class="window-minimize-control rounded-full bg-yellow-400 hover:bg-yellow-500"
          @pointerdown.stop
          @click.stop="minimize"
          title="最小化"
          aria-label="最小化窗口"
        />
        <button
          type="button"
          class="window-maximize-control rounded-full bg-green-400 hover:bg-green-500"
          @pointerdown.stop
          @click.stop="maximize"
          title="最大化"
          aria-label="最大化窗口"
        />
      </div>

      <div class="window-title-group"><span class="window-title-text">{{ window.title }}</span></div>
    </div>
    
    <!-- 窗口内容 -->
      <div class="window-body flex-1 bg-slate-950/76 backdrop-blur-md overflow-hidden relative">
      <component
        v-if="appPlugin"
        :is="appPlugin.component"
        v-bind="pluginProps"
      />
      <iframe
        v-else-if="window.launchMode === 'embedded' && window.url"
        :src="window.url"
        class="w-full h-full border-0"
        :title="`${window.title} 外部内容`"
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
      />
          <div v-else class="w-full h-full flex items-center justify-center text-hud-muted">
        <div class="text-center">
          <div class="window-empty-icon"><IconGlyph :name="window.appId" :size="42" /></div>
          <p class="text-lg font-medium">{{ window.title }}</p>
          <p class="text-sm opacity-70">{{ window.description || '此应用暂未配置 URL' }}</p>
        </div>
      </div>
    </div>
    
    <!-- 调整大小手柄 -->
    <div
      v-if="!window.maximized && !isMobilePanel"
      class="resize-handle absolute bottom-0 right-0 w-4 h-4 cursor-se-resize"
      @pointerdown.stop="startResize"
    />
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { gsap } from 'gsap'
import { useDesktopStore } from '../../stores/desktop.js'
import { getAppPlugin } from '../../apps/registry.js'
import IconGlyph from './IconGlyph.vue'

const props = defineProps({
  window: {
    type: Object,
    required: true,
  },
})

const store = useDesktopStore()
const windowRef = ref(null)
const viewportWidth = ref(typeof window === 'undefined' ? 0 : window.innerWidth)
const isDragging = ref(false)
const isResizing = ref(false)
const dragOffset = ref({ x: 0, y: 0 })
const resizeStart = ref({ x: 0, y: 0, width: 0, height: 0 })
let entranceTween = null

const appPlugin = computed(() => getAppPlugin(props.window.pluginId || props.window.appId))
const pluginProps = computed(() => appPlugin.value?.getProps?.({ window: props.window }) || {})

const isMobilePanel = computed(() => {
  const mobileApps = ['terminal', 'settings', 'profile', 'contact', 'stack', 'project', 'ip-check', 'network-tools']
  return viewportWidth.value < 768 && mobileApps.includes(props.window.appId)
})

const windowStyle = computed(() => ({
  left: `${props.window.x}px`,
  top: `${props.window.y}px`,
  width: `${props.window.width}px`,
  height: `${props.window.height}px`,
  zIndex: props.window.zIndex,
}))

const activePointerId = ref(null)
let interactionFrame = null

const handlePointerDown = (event) => {
  if (props.window.appId === 'settings' && event.target.closest('.settings-toolbar')) {
    startDrag(event)
    return
  }
  store.bringToFront(props.window.id)
}

const cancelInteractionFrame = () => {
  if (interactionFrame === null || typeof window === 'undefined') return
  window.cancelAnimationFrame(interactionFrame)
  interactionFrame = null
}

const finishInteraction = () => {
  const hadInteraction = isDragging.value || isResizing.value
  isDragging.value = false
  isResizing.value = false
  activePointerId.value = null
  cancelInteractionFrame()
  document.removeEventListener('pointermove', handlePointerMove)
  document.removeEventListener('pointerup', finishInteraction)
  document.removeEventListener('pointercancel', finishInteraction)
  if (hadInteraction) store.persistWindowState()
}

const handlePointerMove = (event) => {
  const interaction = dragOffset.value
  if (!activePointerId.value || event.pointerId !== activePointerId.value) return
  if (!isDragging.value && !isResizing.value) return

  const update = () => {
    interactionFrame = null
    if (isDragging.value) {
      store.updateWindowPosition(
        props.window.id,
        event.clientX - interaction.x,
        event.clientY - interaction.y,
      )
    } else if (isResizing.value) {
      store.updateWindowSize(
        props.window.id,
        resizeStart.value.width + (event.clientX - resizeStart.value.x),
        resizeStart.value.height + (event.clientY - resizeStart.value.y),
      )
    }
  }

  if (typeof window !== 'undefined' && window.requestAnimationFrame) {
    cancelInteractionFrame()
    interactionFrame = window.requestAnimationFrame(update)
  } else {
    update()
  }
}

const beginInteraction = (event, type) => {
  if (type === 'drag' && props.window.maximized) return
  event.preventDefault()
  store.bringToFront(props.window.id)
  activePointerId.value = event.pointerId
  isDragging.value = type === 'drag'
  isResizing.value = type === 'resize'

  if (type === 'drag') {
    dragOffset.value = {
      x: event.clientX - props.window.x,
      y: event.clientY - props.window.y,
    }
  } else {
    resizeStart.value = {
      x: event.clientX,
      y: event.clientY,
      width: props.window.width,
      height: props.window.height,
    }
  }

  document.addEventListener('pointermove', handlePointerMove)
  document.addEventListener('pointerup', finishInteraction)
  document.addEventListener('pointercancel', finishInteraction)
}

const startDrag = (event) => beginInteraction(event, 'drag')
const startResize = (event) => beginInteraction(event, 'resize')

const minimize = () => {
  store.minimizeWindow(props.window.id)
}

const maximize = () => {
  store.maximizeWindow(props.window.id)
}

const close = () => {
  store.closeWindow(props.window.id)
}

const handleViewportResize = () => {
  if (typeof window !== 'undefined') viewportWidth.value = window.innerWidth
}

onMounted(() => {
  if (!windowRef.value) return

  window.addEventListener('resize', handleViewportResize)
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

  entranceTween = gsap.fromTo(windowRef.value, {
    opacity: 0,
    y: 14,
    scale: 0.965,
    filter: 'blur(7px)',
  }, {
    opacity: 1,
    y: 0,
    scale: 1,
    filter: 'blur(0px)',
    duration: 0.42,
    ease: 'power3.out',
    clearProps: 'filter,transform',
  })
})

onUnmounted(() => {
  finishInteraction()
  window.removeEventListener('resize', handleViewportResize)
  entranceTween?.kill()
  entranceTween = null
})
</script>

<style scoped>
.window {
  container: desktop-window / inline-size;
  min-width: 400px;
  min-height: 300px;
  border: 1px solid rgba(0, 0, 0, 0.22);
  border-radius: 11px;
  color: #242426;
  background: #f5f5f7;
  box-shadow: 0 18px 55px #0005, 0 0 0 0.5px #ffffff73 inset;
  font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'PingFang SC', sans-serif;
}
.window-focused { box-shadow: 0 22px 65px #0006, 0 0 0 0.5px #ffffff73 inset; }
.title-bar {
  position: relative;
  flex: 0 0 40px;
  height: 40px;
  border-bottom: 1px solid #00000012;
  background: #eeeef0;
  touch-action: none;
}
.window-title-group { position: absolute; left: 100px; right: 100px; overflow: hidden; text-align: center; pointer-events: none; }
.window-title-text { color: inherit; font-size: 13px; font-weight: 600; white-space: nowrap; }
.title-bar > div:first-child { position: relative; z-index: 1; }
.title-bar button { position: relative; width: 12px; height: 12px; border: 0.5px solid #0002; opacity: 1; }
.window-close-control { background: #ff5f57; }
.window-minimize-control { background: #febc2e; }
.window-maximize-control { background: #28c840; }
.title-bar button:hover { filter: brightness(0.94); }
.title-bar button:focus-visible { outline: 2px solid #007aff; outline-offset: 3px; }
.window-body { min-height: 0; background: #f5f5f7; color: inherit; }
.window-dark { color: #eeeef0; background: #202023; border-color: #ffffff2b; }
.window-dark .title-bar { background: #303033; border-color: #ffffff12; }
.window-dark .window-body { background: #202023; }
.window-settings > .title-bar {
  position: absolute;
  top: 0;
  left: 0;
  z-index: 2;
  width: 218px;
  height: 46px;
  border: 0;
  background: transparent;
  box-shadow: none;
  backdrop-filter: none;
}
.window-settings .window-title-group { display: none; }
.window-empty-icon { display: grid; width: 64px; height: 64px; margin: 0 auto 16px; place-items: center; color: #6480ab; }
.resize-handle { background: linear-gradient(135deg, transparent 65%, #8886 65%); }
@media (max-width: 767px) {
  .window { min-width: min(320px, 100%); min-height: 320px; border-radius: 11px; }
}
@container desktop-window (max-width: 620px) {
  .window-settings > .title-bar { width: 100%; height: 44px; }
}
</style>
