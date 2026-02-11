<template>
  <div
    class="app-icon group flex flex-col items-center rounded-2xl cursor-pointer transition-all duration-200 hover:bg-white/25 dark:hover:bg-white/10 hover:backdrop-blur-md"
    :class="wrapperClass"
    @click="handleClick"
    @dblclick="handleDoubleClick"
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
  </div>
</template>

<script setup>
import { computed } from 'vue'
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
  store.openWindow(props.app.id)
}

const handleDoubleClick = () => {
  store.openWindow(props.app.id)
}
</script>

<style scoped>
.app-icon {
  width: 86px;
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
