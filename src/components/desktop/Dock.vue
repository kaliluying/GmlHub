<template>
  <div class="dock-container fixed left-1/2 -translate-x-1/2 z-50">
    <div
      ref="dockRef"
      class="dock flex items-end gap-2.5 sm:gap-3 px-2.5 sm:px-4 pt-4 pb-2 sm:pb-2.5 rounded-2xl sm:rounded-3xl glass dock-shadow"
      :style="dockBoardStyle"
      @mousemove="handleDockMouseMove"
      @mouseleave="handleDockMouseLeave"
    >
      <div
        v-for="(app, index) in store.apps"
        :key="app.id"
        class="dock-item relative group"
        :ref="el => setIconRef(el, index)"
        @click="handleAppClick(app.id)"
      >
        <div
          class="dock-icon rounded-xl flex items-center justify-center cursor-pointer border border-white/35 dark:border-white/15"
          :class="dockIconClass"
          :style="{ backgroundColor: app.color, ...getIconShellStyle(index) }"
        >
          <span class="text-white drop-shadow-md" :style="getIconStyle(index)">{{ app.icon }}</span>
        </div>

        <div
          v-if="isAppOpen(app.id)"
          class="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-gray-800/90 dark:bg-gray-100"
        />

        <div class="tooltip absolute -top-10 left-1/2 -translate-x-1/2 px-3 py-1 rounded-lg bg-gray-900/85 text-white text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
          {{ app.name }}
        </div>
      </div>

      <div class="w-px h-8 sm:h-10 bg-white/35 dark:bg-white/20 mx-1.5 sm:mx-2" />

      <div
        class="dock-item relative group"
        :ref="el => setIconRef(el, trashIndex)"
        @click="showTrash"
      >
        <div class="dock-icon rounded-xl flex items-center justify-center bg-white/35 dark:bg-white/10 border border-white/35 dark:border-white/15 cursor-pointer" :class="dockIconClass" :style="getIconShellStyle(trashIndex)">
          <span :style="getIconStyle(trashIndex)">🗑️</span>
        </div>
        <div class="tooltip absolute -top-10 left-1/2 -translate-x-1/2 px-3 py-1 rounded-lg bg-gray-900/85 text-white text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
          废纸篓
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useDesktopStore } from '../../stores/desktop.js'

const store = useDesktopStore()
const dockRef = ref(null)
const mouseX = ref(null)
const iconRefs = ref([])
const supportsHover = typeof window !== 'undefined' && window.matchMedia('(hover: hover)').matches

const trashIndex = computed(() => store.apps.length)

const dockAnimationProfiles = {
  low: { maxDistance: 120, boardLift: 3.5, shellScale: 0.16, shellLift: 7, iconScale: 0.12, iconLift: 0.9 },
  medium: { maxDistance: 150, boardLift: 5, shellScale: 0.24, shellLift: 11, iconScale: 0.2, iconLift: 1.5 },
  high: { maxDistance: 180, boardLift: 7, shellScale: 0.3, shellLift: 14, iconScale: 0.26, iconLift: 2.2 },
}

const dockAnimationProfile = computed(() => {
  return dockAnimationProfiles[store.settings.dockAnimationLevel] || dockAnimationProfiles.medium
})

const dockIconClass = computed(() => {
  if (store.settings.iconSize === 'small') return 'w-9 h-9 sm:w-10 sm:h-10 text-lg sm:text-xl'
  if (store.settings.iconSize === 'large') return 'w-12 h-12 sm:w-14 sm:h-14 text-2xl sm:text-3xl'
  return 'w-10 h-10 sm:w-12 sm:h-12 text-xl sm:text-2xl'
})

const getCenterX = (index) => {
  const element = iconRefs.value[index]
  if (!element) return null
  const rect = element.getBoundingClientRect()
  return rect.left + rect.width / 2
}

const getInfluence = (index) => {
  if (!supportsHover || mouseX.value == null) {
    return {
      influence: 0,
      eased: 0,
      signedDistance: 0,
    }
  }

  const centerX = getCenterX(index)
  if (centerX == null) {
    return {
      influence: 0,
      eased: 0,
      signedDistance: 0,
    }
  }

  const signedDistance = mouseX.value - centerX
  const distance = Math.abs(signedDistance)
  const maxDistance = dockAnimationProfile.value.maxDistance
  const influence = Math.max(0, 1 - distance / maxDistance)
  const eased = influence * influence

  return {
    influence,
    eased,
    signedDistance,
  }
}

const dockBoardStyle = computed(() => {
  if (!supportsHover || mouseX.value == null) {
    return {
      transform: 'translateY(0)',
    }
  }

  const total = store.apps.length + 1
  let maxInfluence = 0

  for (let index = 0; index < total; index += 1) {
    const { influence } = getInfluence(index)
    if (influence > maxInfluence) maxInfluence = influence
  }

  const lift = maxInfluence * dockAnimationProfile.value.boardLift
  return {
    transform: `translateY(${-lift}px)`,
  }
})

const setIconRef = (element, index) => {
  if (!element) return
  iconRefs.value[index] = element
}

const handleDockMouseMove = (event) => {
  if (!supportsHover) return
  mouseX.value = event.clientX
}

const handleDockMouseLeave = () => {
  mouseX.value = null
}

const getIconShellStyle = (index) => {
  const { eased } = getInfluence(index)
  if (eased === 0) {
    return {
      transform: 'translateY(0) scale(1)',
    }
  }

  const scale = 1 + eased * dockAnimationProfile.value.shellScale
  const lift = eased * dockAnimationProfile.value.shellLift

  return {
    transform: `translateY(${-lift}px) scale(${scale})`,
  }
}

const getIconStyle = (index) => {
  const { eased } = getInfluence(index)
  if (eased === 0) {
    return {
      transform: 'translateY(0) scale(1)',
    }
  }

  const scale = 1 + eased * dockAnimationProfile.value.iconScale
  const lift = eased * dockAnimationProfile.value.iconLift

  return {
    transform: `translateY(${-lift}px) scale(${scale})`,
  }
}

const isAppOpen = (appId) => {
  return store.windows.some(w => w.appId === appId && !w.minimized)
}

const handleAppClick = (appId) => {
  const openWindow = store.windows.find(w => w.appId === appId && !w.minimized)
  if (openWindow) {
    store.bringToFront(openWindow.id)
  } else {
    store.openWindow(appId)
  }
}

const showTrash = () => {
  alert('废纸篓功能开发中...')
}
</script>

<style scoped>
.dock-item {
  position: relative;
  flex: 0 0 auto;
}

.dock-container {
  bottom: max(0.75rem, env(safe-area-inset-bottom));
  width: fit-content;
  max-width: min(96vw, 1120px);
  overflow: visible;
}

.dock {
  overflow: visible;
  scrollbar-width: none;
  width: fit-content;
  max-width: 100%;
  margin: 0 auto;
  transition: transform 180ms cubic-bezier(0.22, 0.8, 0.22, 1);
}

.dock::-webkit-scrollbar {
  display: none;
}

.dock-icon > span {
  display: inline-flex;
  transform-origin: center bottom;
  transition: transform 150ms cubic-bezier(0.22, 0.8, 0.22, 1);
  will-change: transform;
}

.dock-item {
  transition: transform 170ms cubic-bezier(0.22, 0.8, 0.22, 1);
}

.dock-icon {
  transition: transform 170ms cubic-bezier(0.22, 0.8, 0.22, 1);
  will-change: transform;
}

.tooltip {
  z-index: 100;
}

@media (hover: none) {
  .dock-icon > span {
    transition: transform 120ms ease-out;
  }
}
</style>
