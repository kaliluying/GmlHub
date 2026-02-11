<template>
  <div
    class="app-icon group flex flex-col items-center rounded-2xl cursor-pointer transition-all duration-200 hover:bg-white/25 dark:hover:bg-white/10 hover:backdrop-blur-md"
    :class="wrapperClass"
    @click="handleClick"
    @dblclick="handleDoubleClick"
    @contextmenu.prevent.stop="handleContextMenu"
  >
    <div
      class="icon-container rounded-2xl flex items-center justify-center shadow-lg transition-all duration-200 group-hover:scale-110 group-hover:-translate-y-0.5 border border-white/40 dark:border-white/15"
      :class="iconClass"
      :style="{ backgroundColor: app.color }"
    >
      <span class="text-white drop-shadow-md">{{ app.icon }}</span>
    </div>
    <span class="text-[12px] sm:text-sm font-medium text-white/95 drop-shadow-md text-center px-2.5 py-1 rounded-lg bg-black/30 border border-white/20 max-w-full truncate">
      {{ app.name }}
    </span>

    <Teleport to="body">
      <div
        v-if="contextMenu.show"
        ref="menuRef"
        class="icon-context-menu fixed min-w-[130px] rounded-xl border border-white/25 bg-slate-900/90 text-slate-100 shadow-2xl py-1.5 z-[9999]"
        :style="{ left: `${contextMenu.x}px`, top: `${contextMenu.y}px` }"
        @click.stop
      >
        <button class="icon-menu-item" @click="openFromMenu">打开</button>
        <button
          v-if="props.app.id !== 'terminal' && props.app.id !== 'settings'"
          class="icon-menu-item text-rose-300"
          @click="moveToTrash"
        >
          移到废纸篓
        </button>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue'
import { useDesktopStore } from '../../stores/desktop.js'

const props = defineProps({
  app: {
    type: Object,
    required: true,
  },
  iconSize: {
    type: String,
    default: 'medium',
  },
})

const store = useDesktopStore()
const contextMenu = ref({ show: false, x: 0, y: 0 })
const menuRef = ref(null)

const ICON_MENU_EVENT = 'desktop:icon-context-menu-open'
const DESKTOP_MENU_EVENT = 'desktop:context-menu-open'

const wrapperClass = computed(() => {
  if (props.iconSize === 'small') return 'gap-2 p-2 sm:p-2.5'
  if (props.iconSize === 'large') return 'gap-3 p-3 sm:p-3.5'
  return 'gap-2.5 p-2.5 sm:p-3'
})

const iconClass = computed(() => {
  if (props.iconSize === 'small') return 'w-12 h-12 sm:w-14 sm:h-14 text-xl sm:text-2xl'
  if (props.iconSize === 'large') return 'w-16 h-16 sm:w-20 sm:h-20 text-3xl sm:text-4xl'
  return 'w-14 h-14 sm:w-16 sm:h-16 text-2xl sm:text-3xl'
})

const handleClick = () => {
  closeContextMenu()
  store.openWindow(props.app.id)
}

const handleDoubleClick = () => {
  closeContextMenu()
  store.openWindow(props.app.id)
}

const handleContextMenu = async (event) => {
  window.dispatchEvent(new CustomEvent(ICON_MENU_EVENT, { detail: props.app.id }))

  contextMenu.value = {
    show: true,
    x: event.clientX,
    y: event.clientY,
  }

  await nextTick()
  const menuEl = menuRef.value
  if (!menuEl) return

  const rect = menuEl.getBoundingClientRect()
  const maxX = window.innerWidth - rect.width - 8
  const maxY = window.innerHeight - rect.height - 8
  contextMenu.value = {
    show: true,
    x: Math.max(8, Math.min(event.clientX, maxX)),
    y: Math.max(8, Math.min(event.clientY, maxY)),
  }
}

const closeContextMenu = () => {
  if (!contextMenu.value.show) return
  contextMenu.value.show = false
}

const openFromMenu = () => {
  closeContextMenu()
  store.openWindow(props.app.id)
}

const moveToTrash = () => {
  closeContextMenu()
  store.moveAppToTrash(props.app.id)
}

const handleOpenSignal = (event) => {
  if (event.detail === props.app.id) return
  closeContextMenu()
}

const handleDesktopMenuOpen = () => {
  closeContextMenu()
}

const handleDocumentContextMenu = (event) => {
  const target = event.target
  if (target instanceof Element && target.closest('.icon-context-menu')) return
  closeContextMenu()
}

onMounted(() => {
  document.addEventListener('click', closeContextMenu)
  document.addEventListener('contextmenu', handleDocumentContextMenu, true)
  window.addEventListener(ICON_MENU_EVENT, handleOpenSignal)
  window.addEventListener(DESKTOP_MENU_EVENT, handleDesktopMenuOpen)
})

onUnmounted(() => {
  document.removeEventListener('click', closeContextMenu)
  document.removeEventListener('contextmenu', handleDocumentContextMenu, true)
  window.removeEventListener(ICON_MENU_EVENT, handleOpenSignal)
  window.removeEventListener(DESKTOP_MENU_EVENT, handleDesktopMenuOpen)
})
</script>

<style scoped>
.app-icon {
  width: 86px;
}

.icon-menu-item {
  width: 100%;
  text-align: left;
  padding: 6px 10px;
  font-size: 12px;
}

.icon-menu-item:hover {
  background: rgba(148, 163, 184, 0.22);
}

@media (min-width: 640px) {
  .app-icon {
    width: 100px;
  }
}

.icon-container {
  box-shadow: 
    0 8px 20px rgba(10, 20, 36, 0.25),
    0 0 0 1px rgba(255, 255, 255, 0.16) inset;
}
</style>
