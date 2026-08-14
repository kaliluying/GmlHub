<template>
  <div
    v-if="!window.minimized"
    ref="windowRef"
    class="window absolute flex flex-col rounded-2xl overflow-hidden window-shadow transition-shadow"
    :class="{ 'ring-2 ring-sky-400/40': window.focused, 'window-mobile-panel': isMobilePanel }"
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
      <div class="window-title-group flex items-center gap-3">
        <span class="window-title-icon"><IconGlyph :name="window.appId" :size="16" /></span>
        <span class="window-title-copy">
          <span class="window-title-text">{{ window.title }}</span>
          <span class="window-title-id">{{ window.appId }}</span>
        </span>
      </div>
      
      <div class="flex items-center gap-2">
        <button
          type="button"
          class="w-3 h-3 rounded-full bg-yellow-400 hover:bg-yellow-500 transition-colors shadow-sm"
          @pointerdown.stop
          @click.stop="minimize"
          title="最小化"
          aria-label="最小化窗口"
        />
        <button
          type="button"
          class="w-3 h-3 rounded-full bg-green-400 hover:bg-green-500 transition-colors shadow-sm"
          @pointerdown.stop
          @click.stop="maximize"
          title="最大化"
          aria-label="最大化窗口"
        />
        <button
          type="button"
          class="w-3 h-3 rounded-full bg-red-400 hover:bg-red-500 transition-colors shadow-sm"
          @pointerdown.stop
          @click.stop="close"
          title="关闭"
          aria-label="关闭窗口"
        />
      </div>
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
  const mobileApps = ['terminal', 'settings', 'profile', 'contact', 'stack', 'project']
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

const handlePointerDown = () => {
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
  min-width: 400px;
  min-height: 300px;
  border: 1px solid rgba(156, 231, 255, 0.26);
  border-radius: 1.05rem;
  background: rgba(3, 10, 20, 0.78);
  box-shadow:
    0 32px 80px rgba(1, 7, 18, 0.62),
    0 0 0 1px rgba(255, 255, 255, 0.04) inset,
    0 0 36px rgba(92, 212, 255, 0.06);
  backdrop-filter: blur(18px) saturate(125%);
  -webkit-backdrop-filter: blur(18px) saturate(125%);
}

.window:focus-within {
  box-shadow:
    0 32px 80px rgba(1, 7, 18, 0.62),
    0 0 0 1px rgba(156, 231, 255, 0.16) inset,
    0 0 44px rgba(92, 212, 255, 0.11);
}

.title-bar {
  height: 3.15rem;
  border-bottom: 1px solid rgba(156, 231, 255, 0.14);
  background:
    linear-gradient(180deg, rgba(15, 36, 54, 0.92), rgba(5, 15, 27, 0.82)),
    radial-gradient(circle at 0% 0%, rgba(156, 231, 255, 0.13), transparent 38%);
}

.window-title-group {
  min-width: 0;
}

.window-title-icon {
  display: grid;
  width: 1.8rem;
  height: 1.8rem;
  flex: 0 0 auto;
  place-items: center;
  border: 1px solid rgba(156, 231, 255, 0.24);
  border-radius: 0.58rem;
  color: #bdefff;
  background: rgba(156, 231, 255, 0.1);
  box-shadow: 0 0 14px rgba(92, 212, 255, 0.09) inset;
}

.window-title-copy {
  display: grid;
  min-width: 0;
  gap: 0.05rem;
}

.window-title-text {
  overflow: hidden;
  color: rgba(242, 247, 255, 0.96);
  font-size: 0.82rem;
  font-weight: 650;
  letter-spacing: 0.02em;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.window-title-id {
  overflow: hidden;
  color: rgba(142, 164, 190, 0.7);
  font-family: 'Cascadia Code', 'SFMono-Regular', Consolas, monospace;
  font-size: 0.5rem;
  letter-spacing: 0.1em;
  text-overflow: ellipsis;
  text-transform: uppercase;
  white-space: nowrap;
}

.title-bar button {
  width: 0.72rem;
  height: 0.72rem;
  opacity: 0.78;
  transition: transform 160ms ease, opacity 160ms ease, filter 160ms ease;
}

.title-bar button:hover {
  opacity: 1;
  transform: scale(1.18);
  filter: brightness(1.15);
}

.title-bar button:focus-visible {
  outline: 2px solid rgba(156, 231, 255, 0.92);
  outline-offset: 3px;
}

.window-body {
  background:
    radial-gradient(circle at 80% 0%, rgba(92, 212, 255, 0.08), transparent 34%),
    linear-gradient(145deg, rgba(6, 20, 34, 0.88), rgba(1, 7, 16, 0.94));
}

.window-empty-icon {
  display: grid;
  width: 4.8rem;
  height: 4.8rem;
  margin: 0 auto 1rem;
  place-items: center;
  border: 1px solid rgba(156, 231, 255, 0.22);
  border-radius: 1.25rem;
  color: #bdefff;
  background: rgba(156, 231, 255, 0.08);
  box-shadow: 0 0 34px rgba(92, 212, 255, 0.12);
}

.window-mobile-panel {
  min-width: 320px;
  min-height: 320px;
}

.resize-handle {
  background: linear-gradient(135deg, transparent 50%, rgba(148, 163, 184, 0.6) 50%);
}

@media (max-width: 767px) {
  .window {
    min-width: 320px;
    min-height: 320px;
    border-radius: 0.9rem;
  }

  .title-bar {
    height: 2.9rem;
  }
}

/* Liquid glass window chrome */
.window {
  min-width: 400px;
  min-height: 300px;
  border: 1px solid rgba(255, 255, 255, 0.78);
  border-radius: 1.35rem;
  background: rgba(248, 251, 255, 0.72);
  color: #182235;
  box-shadow: 0 30px 78px rgba(73, 91, 121, 0.22), 0 2px 0 rgba(255, 255, 255, 0.84) inset;
  backdrop-filter: blur(30px) saturate(150%);
  -webkit-backdrop-filter: blur(30px) saturate(150%);
}

.window:focus-within {
  box-shadow: 0 30px 78px rgba(73, 91, 121, 0.22), 0 0 0 2px rgba(91, 131, 206, 0.2) inset, 0 2px 0 rgba(255, 255, 255, 0.84) inset;
}

.title-bar {
  height: 3.2rem;
  border-bottom: 1px solid rgba(116, 133, 158, 0.14);
  background: rgba(255, 255, 255, 0.48);
  box-shadow: 0 1px 0 rgba(255, 255, 255, 0.7) inset;
  backdrop-filter: blur(24px) saturate(150%);
  -webkit-backdrop-filter: blur(24px) saturate(150%);
}

.window-title-icon {
  width: 1.85rem;
  height: 1.85rem;
  border-color: rgba(255, 255, 255, 0.72);
  border-radius: 0.64rem;
  color: #557bc2;
  background: rgba(224, 236, 255, 0.66);
  box-shadow: 0 1px 0 rgba(255, 255, 255, 0.76) inset;
}

.window-title-text {
  color: #182235;
  font-family: inherit;
  letter-spacing: -0.01em;
}

.window-title-id {
  color: #8b98aa;
  font-family: inherit;
  letter-spacing: 0.03em;
  text-transform: none;
}

.title-bar button:focus-visible {
  outline-color: rgba(91, 131, 206, 0.82);
}

.window-body {
  background:
    radial-gradient(circle at 82% 0%, rgba(212, 227, 255, 0.42), transparent 34%),
    linear-gradient(145deg, rgba(248, 251, 255, 0.72), rgba(231, 239, 249, 0.54));
  color: #182235;
}

.window-empty-icon {
  border-color: rgba(255, 255, 255, 0.78);
  border-radius: 1.35rem;
  color: #5b83ce;
  background: rgba(224, 236, 255, 0.62);
  box-shadow: 0 20px 36px rgba(91, 131, 206, 0.14), 0 1px 0 rgba(255, 255, 255, 0.76) inset;
}

.resize-handle {
  background: linear-gradient(135deg, transparent 50%, rgba(119, 139, 169, 0.52) 50%);
}

@media (max-width: 767px) {
  .window {
    min-width: 320px;
    min-height: 320px;
    border-radius: 1.1rem;
  }

  .title-bar {
    height: 2.95rem;
  }
}

@media (prefers-reduced-transparency: reduce) {
  .window,
  .title-bar {
    background: #f8fafc;
    backdrop-filter: none;
    -webkit-backdrop-filter: none;
  }
}
</style>
