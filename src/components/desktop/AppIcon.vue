<template>
  <div
    class="app-icon group flex flex-col items-center rounded-2xl cursor-pointer transition-all duration-200"
    :class="wrapperClass"
    draggable="true"
    @click="handleClick"
    @dblclick="handleDoubleClick"
    @contextmenu.prevent.stop="handleContextMenu"
    @dragstart="handleDragStart"
    @dragenter.prevent="handleDragEnter"
    @dragleave="handleDragLeave"
    @dragover.prevent="handleDragOver"
    @drop.prevent="handleDrop"
    @dragend="handleDragEnd"
  >
    <div
      class="icon-container rounded-[1.1rem] flex items-center justify-center transition-all duration-200 group-hover:scale-[1.08] group-hover:-translate-y-0.5 border border-white/25"
      :class="iconClass"
      :style="{ backgroundColor: app.color }"
    >
      <span class="text-white drop-shadow-md">{{ app.icon }}</span>
    </div>
    <span class="desktop-icon-label">
      {{ app.name }}
    </span>

    <ContextMenu
      :show="contextMenu.show"
      :x="contextMenu.x"
      :y="contextMenu.y"
      :items="iconMenuItems"
      @select="handleMenuSelect"
      @close="closeContextMenu"
    />
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useDesktopStore } from '../../stores/desktop.js'
import ContextMenu from './ContextMenu.vue'

const props = defineProps({
  app: {
    type: Object,
    required: true,
  },
  iconSize: {
    type: String,
    default: 'medium',
  },
  isDragging: {
    type: Boolean,
    default: false,
  },
  isDropTarget: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits([
  'drag-start-icon',
  'drag-enter-icon',
  'drag-leave-icon',
  'drag-over-icon',
  'drop-icon',
  'drag-end-icon',
])

const store = useDesktopStore()
const contextMenu = ref({ show: false, x: 0, y: 0 })
let clickTimer = null
const suppressOpenUntil = ref(0)
const didDrag = ref(false)

const ICON_MENU_EVENT = 'desktop:icon-context-menu-open'
const DESKTOP_MENU_EVENT = 'desktop:context-menu-open'

const iconMenuItems = computed(() => {
  const items = [{ key: 'open', label: '打开' }]
  if (props.app.id !== 'terminal' && props.app.id !== 'settings') {
    items.push({ key: 'trash', label: '移到废纸篓', danger: true })
  }
  return items
})

const wrapperClass = computed(() => {
  let sizeClass = 'gap-2.5 p-2.5 sm:p-3'
  if (props.iconSize === 'small') sizeClass = 'gap-2 p-2 sm:p-2.5'
  if (props.iconSize === 'large') sizeClass = 'gap-3 p-3 sm:p-3.5'

  return [
    sizeClass,
    {
      'is-dragging': props.isDragging,
      'is-drop-target': props.isDropTarget,
    },
  ]
})

const iconClass = computed(() => {
  if (props.iconSize === 'small') return 'w-12 h-12 sm:w-14 sm:h-14 text-xl sm:text-2xl'
  if (props.iconSize === 'large') return 'w-16 h-16 sm:w-20 sm:h-20 text-3xl sm:text-4xl'
  return 'w-14 h-14 sm:w-16 sm:h-16 text-2xl sm:text-3xl'
})

const handleClick = () => {
  if (Date.now() < suppressOpenUntil.value) return

  closeContextMenu()
  if (clickTimer) {
    clearTimeout(clickTimer)
    clickTimer = null
  }

  clickTimer = setTimeout(() => {
    store.openWindow(props.app.id)
    clickTimer = null
  }, 220)
}

const handleDoubleClick = () => {
  if (Date.now() < suppressOpenUntil.value) return

  if (clickTimer) {
    clearTimeout(clickTimer)
    clickTimer = null
  }

  closeContextMenu()
  store.openWindow(props.app.id)
}

const handleDragStart = (event) => {
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', props.app.id)
  }

  didDrag.value = false
  emit('drag-start-icon', props.app.id)
}

const handleDragEnter = () => {
  emit('drag-enter-icon', props.app.id)
}

const handleDragOver = (event) => {
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'move'
  }

  didDrag.value = true
  emit('drag-over-icon', props.app.id)
}

const handleDragLeave = (event) => {
  const nextTarget = event.relatedTarget
  if (nextTarget instanceof Node && event.currentTarget instanceof Node && event.currentTarget.contains(nextTarget)) {
    return
  }

  emit('drag-leave-icon', props.app.id)
}

const handleDrop = () => {
  emit('drop-icon', props.app.id)
}

const handleDragEnd = () => {
  if (didDrag.value) {
    suppressOpenUntil.value = Date.now() + 200
  }

  didDrag.value = false
  emit('drag-end-icon', props.app.id)
}

const handleContextMenu = (event) => {
  window.dispatchEvent(new CustomEvent(ICON_MENU_EVENT, { detail: props.app.id }))

  contextMenu.value = {
    show: true,
    x: event.clientX,
    y: event.clientY,
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

const handleMenuSelect = (key) => {
  if (key === 'open') {
    openFromMenu()
    return
  }

  if (key === 'trash') {
    moveToTrash()
  }
}

const handleOpenSignal = (event) => {
  if (event.detail === props.app.id) return
  closeContextMenu()
}

const handleDesktopMenuOpen = () => {
  closeContextMenu()
}

onMounted(() => {
  window.addEventListener(ICON_MENU_EVENT, handleOpenSignal)
  window.addEventListener(DESKTOP_MENU_EVENT, handleDesktopMenuOpen)
})

onUnmounted(() => {
  if (clickTimer) {
    clearTimeout(clickTimer)
    clickTimer = null
  }

  window.removeEventListener(ICON_MENU_EVENT, handleOpenSignal)
  window.removeEventListener(DESKTOP_MENU_EVENT, handleDesktopMenuOpen)
})
</script>

<style scoped>
.app-icon {
  width: 92px;
  border: 1px solid transparent;
  transition: background 170ms ease, border-color 170ms ease, box-shadow 170ms ease;
}

.app-icon:hover {
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.14) 0%, rgba(15, 23, 42, 0.12) 100%);
  border-color: rgba(255, 255, 255, 0.28);
  box-shadow: 0 12px 28px -22px rgba(8, 15, 33, 0.9);
}

.app-icon.is-dragging {
  opacity: 0.7;
  transform: scale(0.96);
}

.app-icon.is-drop-target {
  border-color: rgba(34, 211, 238, 0.72);
  background: linear-gradient(180deg, rgba(14, 165, 233, 0.24) 0%, rgba(8, 47, 73, 0.18) 100%);
  box-shadow: 0 0 0 1px rgba(34, 211, 238, 0.48), 0 14px 28px -22px rgba(34, 211, 238, 0.8);
}

@media (min-width: 640px) {
  .app-icon {
    width: 106px;
  }
}

.icon-container {
  box-shadow: 
    0 12px 24px rgba(10, 20, 36, 0.3),
    0 1px 0 rgba(255, 255, 255, 0.36) inset;
  position: relative;
  overflow: hidden;
}

.icon-container::before {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.48) 0%, rgba(255, 255, 255, 0.14) 34%, rgba(255, 255, 255, 0.02) 70%);
}

.desktop-icon-label {
  width: 100%;
  font-size: 12px;
  line-height: 1.2;
  font-weight: 500;
  color: rgba(248, 250, 252, 0.98);
  text-align: center;
  padding: 0.28rem 0.48rem;
  border-radius: 0.58rem;
  border: 1px solid rgba(255, 255, 255, 0.26);
  background: rgba(15, 23, 42, 0.36);
  backdrop-filter: blur(5px);
  text-shadow: 0 1px 2px rgba(2, 6, 23, 0.78);
  max-width: 100%;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

@media (min-width: 640px) {
  .desktop-icon-label {
    font-size: 13px;
    border-radius: 0.62rem;
  }
}
</style>
