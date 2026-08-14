<template>
  <div
    class="app-icon group flex flex-col items-center rounded-2xl cursor-pointer transition-all duration-200"
    :class="wrapperClass"
    role="button"
    tabindex="0"
    :aria-label="`打开 ${app.name}`"
    draggable="true"
    @click="handleClick"
    @dblclick="handleDoubleClick"
    @keydown.enter.prevent="handleDoubleClick"
    @keydown.space.prevent="handleDoubleClick"
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
      :style="{ '--app-color': app.color }"
    >
      <IconGlyph :name="app.id" :size="iconGlyphSize" />
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
import { navigateToApp } from '../../services/deepLinks.js'
import ContextMenu from './ContextMenu.vue'
import IconGlyph from './IconGlyph.vue'

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
  if (props.app.repoUrl || props.app.content || props.app.stack?.length) {
    items.push({ key: 'details', label: '查看项目详情' })
  }
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

const iconGlyphSize = computed(() => {
  if (props.iconSize === 'small') return 24
  if (props.iconSize === 'large') return 34
  return 29
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

const openDetails = () => {
  closeContextMenu()
  navigateToApp(props.app.id)
  store.openProjectDetails(props.app.id)
}

const handleMenuSelect = (key) => {
  if (key === 'open') {
    openFromMenu()
    return
  }

  if (key === 'trash') {
    moveToTrash()
    return
  }

  if (key === 'details') {
    openDetails()
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

.app-icon:focus-visible {
  outline: 2px solid rgba(156, 231, 255, 0.92);
  outline-offset: 4px;
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
  background:
    linear-gradient(145deg, rgba(255, 255, 255, 0.36), rgba(255, 255, 255, 0.04) 42%, rgba(2, 8, 18, 0.24)),
    var(--app-color, #1e293b);
  box-shadow: 
    0 12px 24px rgba(10, 20, 36, 0.3),
    0 1px 0 rgba(255, 255, 255, 0.42) inset,
    0 0 0 1px rgba(255, 255, 255, 0.08);
  position: relative;
  overflow: hidden;
}

.icon-container .icon-glyph {
  position: relative;
  z-index: 1;
  filter: drop-shadow(0 3px 5px rgba(0, 0, 0, 0.28));
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

/* Liquid glass icon treatment */
.app-icon {
  width: 100%;
  max-width: 106px;
  border-color: transparent;
  border-radius: 1.25rem;
  transition: background 180ms ease, border-color 180ms ease, box-shadow 180ms ease, transform 180ms ease;
}

.app-icon:hover {
  border-color: rgba(255, 255, 255, 0.74);
  background: rgba(255, 255, 255, 0.46);
  box-shadow: 0 12px 24px rgba(96, 119, 155, 0.11), 0 1px 0 rgba(255, 255, 255, 0.7) inset;
}

.app-icon:active {
  transform: scale(0.97);
}

.app-icon:focus-visible {
  outline-color: rgba(91, 131, 206, 0.82);
}

.app-icon.is-drop-target {
  border-color: rgba(91, 131, 206, 0.46);
  background: rgba(225, 235, 255, 0.72);
  box-shadow: 0 0 0 2px rgba(91, 131, 206, 0.14), 0 12px 24px rgba(91, 131, 206, 0.12);
}

.icon-container {
  border-color: rgba(255, 255, 255, 0.7);
  border-radius: 1.2rem;
  filter: saturate(0.9);
  box-shadow:
    0 12px 24px rgba(76, 98, 132, 0.2),
    0 2px 0 rgba(255, 255, 255, 0.56) inset,
    0 0 0 1px rgba(255, 255, 255, 0.12);
}

.icon-container .icon-glyph {
  filter: drop-shadow(0 2px 4px rgba(35, 52, 79, 0.2));
}

.desktop-icon-label {
  color: #26334a;
  border: 0;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.46);
  box-shadow: 0 1px 0 rgba(255, 255, 255, 0.58) inset;
  backdrop-filter: blur(10px) saturate(140%);
  -webkit-backdrop-filter: blur(10px) saturate(140%);
  text-shadow: none;
}

@media (prefers-reduced-transparency: reduce) {
  .desktop-icon-label {
    background: #f8fafc;
    backdrop-filter: none;
    -webkit-backdrop-filter: none;
  }
}
</style>
