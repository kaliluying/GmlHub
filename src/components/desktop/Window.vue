<template>
  <div
    v-if="!window.minimized"
    class="window absolute flex flex-col rounded-2xl overflow-hidden window-shadow transition-shadow"
    :class="{ 'ring-2 ring-sky-300/60 dark:ring-sky-400/40': window.focused }"
    :style="windowStyle"
    @mousedown="handleMouseDown"
  >
    <!-- 标题栏 -->
    <div
      class="title-bar h-11 flex items-center justify-between px-4 glass-strong cursor-default"
      @mousedown="startDrag"
    >
      <div class="flex items-center gap-3">
        <span class="text-lg">{{ window.icon }}</span>
        <span class="text-sm font-semibold tracking-wide text-gray-800 dark:text-gray-100">{{ window.title }}</span>
      </div>
      
      <div class="flex items-center gap-2">
        <button
          class="w-3 h-3 rounded-full bg-yellow-400 hover:bg-yellow-500 transition-colors shadow-sm"
          @click="minimize"
          title="最小化"
        />
        <button
          class="w-3 h-3 rounded-full bg-green-400 hover:bg-green-500 transition-colors shadow-sm"
          @click="maximize"
          title="最大化"
        />
        <button
          class="w-3 h-3 rounded-full bg-red-400 hover:bg-red-500 transition-colors shadow-sm"
          @click="close"
          title="关闭"
        />
      </div>
    </div>
    
    <!-- 窗口内容 -->
    <div class="flex-1 bg-white/86 dark:bg-slate-950/76 backdrop-blur-md overflow-hidden relative">
      <TerminalPanel v-if="window.appId === 'terminal'" />
      <SettingsPanel v-else-if="window.appId === 'settings'" />
      <iframe
        v-else-if="window.url"
        :src="window.url"
        class="w-full h-full border-0"
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
      />
      <div v-else class="w-full h-full flex items-center justify-center text-gray-500 dark:text-slate-300">
        <div class="text-center">
          <div class="text-6xl mb-4">{{ window.icon }}</div>
          <p class="text-lg font-medium">{{ window.title }}</p>
          <p class="text-sm opacity-70">此应用暂未配置 URL</p>
        </div>
      </div>
    </div>
    
    <!-- 调整大小手柄 -->
    <div
      v-if="!window.maximized"
      class="resize-handle absolute bottom-0 right-0 w-4 h-4 cursor-se-resize"
      @mousedown="startResize"
    />
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useDesktopStore } from '../../stores/desktop.js'
import TerminalPanel from './TerminalPanel.vue'
import SettingsPanel from './SettingsPanel.vue'

const props = defineProps({
  window: {
    type: Object,
    required: true,
  },
})

const store = useDesktopStore()
const isDragging = ref(false)
const isResizing = ref(false)
const dragOffset = ref({ x: 0, y: 0 })
const resizeStart = ref({ x: 0, y: 0, width: 0, height: 0 })

const windowStyle = computed(() => ({
  left: `${props.window.x}px`,
  top: `${props.window.y}px`,
  width: `${props.window.width}px`,
  height: `${props.window.height}px`,
  zIndex: props.window.zIndex,
}))

const handleMouseDown = () => {
  store.bringToFront(props.window.id)
}

const startDrag = (e) => {
  if (props.window.maximized) return
  isDragging.value = true
  dragOffset.value = {
    x: e.clientX - props.window.x,
    y: e.clientY - props.window.y,
  }
  
  const handleMouseMove = (e) => {
    if (!isDragging.value) return
    const newX = e.clientX - dragOffset.value.x
    const newY = e.clientY - dragOffset.value.y
    store.updateWindowPosition(props.window.id, newX, newY)
  }
  
  const handleMouseUp = () => {
    isDragging.value = false
    document.removeEventListener('mousemove', handleMouseMove)
    document.removeEventListener('mouseup', handleMouseUp)
  }
  
  document.addEventListener('mousemove', handleMouseMove)
  document.addEventListener('mouseup', handleMouseUp)
}

const startResize = (e) => {
  e.stopPropagation()
  isResizing.value = true
  resizeStart.value = {
    x: e.clientX,
    y: e.clientY,
    width: props.window.width,
    height: props.window.height,
  }
  
  const handleMouseMove = (e) => {
    if (!isResizing.value) return
    const newWidth = Math.max(400, resizeStart.value.width + (e.clientX - resizeStart.value.x))
    const newHeight = Math.max(300, resizeStart.value.height + (e.clientY - resizeStart.value.y))
    store.updateWindowSize(props.window.id, newWidth, newHeight)
  }
  
  const handleMouseUp = () => {
    isResizing.value = false
    document.removeEventListener('mousemove', handleMouseMove)
    document.removeEventListener('mouseup', handleMouseUp)
  }
  
  document.addEventListener('mousemove', handleMouseMove)
  document.addEventListener('mouseup', handleMouseUp)
}

const minimize = () => {
  store.minimizeWindow(props.window.id)
}

const maximize = () => {
  store.maximizeWindow(props.window.id)
}

const close = () => {
  store.closeWindow(props.window.id)
}
</script>

<style scoped>
.window {
  min-width: 400px;
  min-height: 300px;
  border: 1px solid rgba(255, 255, 255, 0.35);
}

.dark .window {
  border-color: rgba(255, 255, 255, 0.14);
}

.resize-handle {
  background: linear-gradient(135deg, transparent 50%, rgba(148, 163, 184, 0.6) 50%);
}
</style>
