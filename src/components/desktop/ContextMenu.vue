<template>
  <Teleport to="body">
    <div
      v-if="show"
      ref="menuRef"
      class="ctx-menu fixed rounded-xl border border-white/25 bg-slate-900/90 text-slate-100 shadow-2xl py-1.5"
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
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'

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

watch(
  () => props.show,
  (show) => {
    if (!show) return
    updatePosition()
  },
)

watch(
  () => [props.x, props.y],
  () => {
    if (!props.show) return
    updatePosition()
  },
)

onMounted(() => {
  document.addEventListener('click', handleOutsideClick, true)
  document.addEventListener('contextmenu', handleOutsideContextMenu, true)
  window.addEventListener('keydown', handleEscape)
})

onUnmounted(() => {
  document.removeEventListener('click', handleOutsideClick, true)
  document.removeEventListener('contextmenu', handleOutsideContextMenu, true)
  window.removeEventListener('keydown', handleEscape)
})
</script>

<style scoped>
.ctx-item {
  width: 100%;
  text-align: left;
  padding: 6px 10px;
  font-size: 12px;
}

.ctx-item:hover:not(:disabled) {
  background: rgba(148, 163, 184, 0.22);
}

.ctx-item:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.ctx-item.danger {
  color: rgb(253 164 175);
}

.ctx-divider {
  margin: 4px 0;
  border-top: 1px solid rgba(148, 163, 184, 0.26);
}
</style>
