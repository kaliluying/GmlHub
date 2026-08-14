<template>
  <Teleport to="body">
    <div
      v-if="show"
      ref="menuRef"
      class="ctx-menu fixed rounded-xl border border-white/20 bg-[rgba(7,12,22,0.92)] text-hud-text shadow-2xl py-1.5 backdrop-blur-xl"
      :style="menuStyle"
      @click.stop
    >
      <template v-for="item in items" :key="item.key">
        <div v-if="item.type === 'divider'" class="ctx-divider" />
        <button
          v-else
          class="ctx-item"
          :class="{ danger: item.danger }"
          :disabled="item.disabled"
          @click="select(item.key)"
        >
          {{ item.label }}
        </button>
      </template>
    </div>
  </Teleport>
</template>

<script setup>
import { computed, nextTick, onUnmounted, ref, watch } from 'vue'

const props = defineProps({
  show: {
    type: Boolean,
    default: false,
  },
  x: {
    type: Number,
    default: 0,
  },
  y: {
    type: Number,
    default: 0,
  },
  items: {
    type: Array,
    default: () => [],
  },
  minWidth: {
    type: Number,
    default: 130,
  },
  zIndex: {
    type: Number,
    default: 9999,
  },
})

const emit = defineEmits(['select', 'close'])

const menuRef = ref(null)
const position = ref({ x: 0, y: 0 })
let listenersAttached = false

const menuStyle = computed(() => ({
  left: `${position.value.x}px`,
  top: `${position.value.y}px`,
  minWidth: `${props.minWidth}px`,
  zIndex: props.zIndex,
}))

const updatePosition = async () => {
  position.value = { x: props.x, y: props.y }
  await nextTick()

  const menuEl = menuRef.value
  if (!menuEl || typeof window === 'undefined') return

  const rect = menuEl.getBoundingClientRect()
  const maxX = window.innerWidth - rect.width - 8
  const maxY = window.innerHeight - rect.height - 8
  position.value = {
    x: Math.max(8, Math.min(props.x, maxX)),
    y: Math.max(8, Math.min(props.y, maxY)),
  }
}

const handleOutsideClick = (event) => {
  if (!props.show) return
  const target = event.target
  if (target instanceof Element && target.closest('.ctx-menu')) return
  emit('close')
}

const handleOutsideContextMenu = (event) => {
  if (!props.show) return
  const target = event.target
  if (target instanceof Element && target.closest('.ctx-menu')) return
  emit('close')
}

const handleEscape = (event) => {
  if (!props.show) return
  if (event.key !== 'Escape') return
  emit('close')
}

const select = (key) => {
  emit('select', key)
  emit('close')
}

const addGlobalListeners = () => {
  if (listenersAttached) return
  document.addEventListener('click', handleOutsideClick, true)
  document.addEventListener('contextmenu', handleOutsideContextMenu, true)
  window.addEventListener('keydown', handleEscape)
  listenersAttached = true
}

const removeGlobalListeners = () => {
  if (!listenersAttached) return
  document.removeEventListener('click', handleOutsideClick, true)
  document.removeEventListener('contextmenu', handleOutsideContextMenu, true)
  window.removeEventListener('keydown', handleEscape)
  listenersAttached = false
}

watch(
  () => props.show,
  (show) => {
    if (!show) {
      removeGlobalListeners()
      return
    }

    addGlobalListeners()
    updatePosition()
  },
  { immediate: true },
)

watch(
  () => [props.x, props.y],
  () => {
    if (!props.show) return
    updatePosition()
  },
)

onUnmounted(() => {
  removeGlobalListeners()
})
</script>

<style scoped>
.ctx-item {
  width: 100%;
  text-align: left;
  padding: 6px 10px;
  font-size: 12px;
  border-radius: 6px;
  transition: background 0.16s var(--ease-hud), color 0.16s var(--ease-hud);
}

.ctx-item:hover:not(:disabled) {
  background: rgba(56, 189, 248, 0.16);
  color: var(--hud-text);
}

.ctx-item:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.ctx-item.danger {
  color: rgb(253 164 175);
}

.ctx-item.danger:hover:not(:disabled) {
  background: rgba(244, 63, 94, 0.16);
  color: rgb(254 205 211);
}

.ctx-divider {
  margin: 4px 8px;
  border-top: 1px solid rgba(125, 211, 252, 0.14);
}

.ctx-menu {
  border-color: rgba(255, 255, 255, 0.78) !important;
  border-radius: 0.9rem;
  background: rgba(248, 251, 255, 0.82) !important;
  color: #182235;
  box-shadow: 0 22px 48px rgba(73, 91, 121, 0.2), 0 2px 0 rgba(255, 255, 255, 0.84) inset;
  backdrop-filter: blur(26px) saturate(150%);
  -webkit-backdrop-filter: blur(26px) saturate(150%);
}

.ctx-item:hover:not(:disabled) {
  background: rgba(224, 236, 255, 0.72);
  color: #243452;
}

.ctx-item.danger {
  color: #b65060;
}

.ctx-item.danger:hover:not(:disabled) {
  background: rgba(255, 226, 231, 0.74);
  color: #a84556;
}

.ctx-divider {
  border-top-color: rgba(116, 133, 158, 0.16);
}
</style>
