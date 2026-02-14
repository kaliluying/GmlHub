<template>
  <div class="dock-container fixed left-1/2 -translate-x-1/2 z-50">
    <div
      ref="dockRef"
      class="dock dock-surface flex items-end gap-2.5 sm:gap-3 px-3 sm:px-[1.125rem] pt-3 pb-2 sm:pb-2.5 rounded-[1.55rem] sm:rounded-[1.8rem] dock-shadow"
      :style="dockBoardStyle"
      @mousemove="handleDockMouseMove"
      @mouseleave="handleDockMouseLeave"
      @scroll="handleDockScroll"
    >
      <div
        v-for="(app, index) in store.desktopApps"
        :key="app.id"
        class="dock-item relative group"
        :ref="el => setIconRef(el, index)"
        @click="handleAppClick(app.id)"
        @keydown.enter.prevent="handleAppClick(app.id)"
        @keydown.space.prevent="handleAppClick(app.id)"
        role="button"
        tabindex="0"
        :aria-label="`打开 ${app.name}`"
      >
        <div
          class="dock-icon rounded-[1.15rem] flex items-center justify-center cursor-pointer border border-white/20"
          :class="dockIconClass"
          :style="{ backgroundColor: app.color, ...getIconShellStyle(index) }"
        >
          <span class="text-white drop-shadow-md" :style="getIconStyle(index)">{{ app.icon }}</span>
        </div>

        <div
          v-if="isAppOpen(app.id)"
            class="dock-open-indicator"
        />

        <div class="tooltip dock-tooltip absolute -top-10 left-1/2 -translate-x-1/2 px-3 py-1 rounded-lg text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
          {{ app.name }}
        </div>
      </div>

      <div class="dock-divider" />

      <div
        class="dock-item relative group"
        :ref="el => setIconRef(el, trashIndex)"
        @click="showTrash"
        @keydown.enter.prevent="showTrash"
        @keydown.space.prevent="showTrash"
        role="button"
        tabindex="0"
        aria-label="打开废纸篓"
      >
      <div class="dock-icon dock-trash rounded-[1.15rem] flex items-center justify-center border border-white/20 cursor-pointer" :class="dockIconClass" :style="getIconShellStyle(trashIndex)">
          <span :style="getIconStyle(trashIndex)">🗑️</span>
        </div>
        <div class="tooltip dock-tooltip absolute -top-10 left-1/2 -translate-x-1/2 px-3 py-1 rounded-lg text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
          废纸篓
        </div>

        <div
          v-if="store.trashCount > 0"
          class="dock-trash-badge"
        >
          {{ store.trashCount }}
        </div>
      </div>

      <div class="dock-reflection" aria-hidden="true" />
    </div>

    <div v-show="canScrollLeft" class="dock-scroll-fade dock-scroll-fade-left" aria-hidden="true" />
    <div v-show="canScrollRight" class="dock-scroll-fade dock-scroll-fade-right" aria-hidden="true" />
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useDesktopStore } from '../../stores/desktop.js'

const store = useDesktopStore()
const dockRef = ref(null)
const mouseX = ref(null)
const iconRefs = ref([])
const canScrollLeft = ref(false)
const canScrollRight = ref(false)
const supportsHover = typeof window !== 'undefined' && window.matchMedia('(hover: hover)').matches

const trashIndex = computed(() => store.desktopApps.length)

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

  const total = store.desktopApps.length + 1
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

const updateDockScrollHints = () => {
  if (typeof window === 'undefined' || !dockRef.value) {
    canScrollLeft.value = false
    canScrollRight.value = false
    return
  }

  if (window.innerWidth >= 768) {
    canScrollLeft.value = false
    canScrollRight.value = false
    return
  }

  const element = dockRef.value
  const hasOverflow = element.scrollWidth - element.clientWidth > 2
  if (!hasOverflow) {
    canScrollLeft.value = false
    canScrollRight.value = false
    return
  }

  canScrollLeft.value = element.scrollLeft > 6
  canScrollRight.value = element.scrollLeft + element.clientWidth < element.scrollWidth - 6
}

const syncDockScrollHints = () => {
  if (typeof window === 'undefined') return
  window.requestAnimationFrame(updateDockScrollHints)
}

const handleDockScroll = () => {
  updateDockScrollHints()
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
  store.openTrashWindow()
}

onMounted(() => {
  syncDockScrollHints()
  if (typeof window === 'undefined') return
  window.addEventListener('resize', syncDockScrollHints)
})

onUnmounted(() => {
  if (typeof window === 'undefined') return
  window.removeEventListener('resize', syncDockScrollHints)
})

watch(
  () => [store.desktopApps.length, store.settings.iconSize],
  () => {
    nextTick(syncDockScrollHints)
  },
)
</script>

<style scoped>
.dock-item {
  position: relative;
  flex: 0 0 auto;
}

.dock-container {
  bottom: max(0.55rem, calc(env(safe-area-inset-bottom) * 0.3 + 0.12rem));
  width: fit-content;
  max-width: min(96vw, 1120px);
  overflow: visible;
}

.dock {
  position: relative;
  overflow: visible;
  scrollbar-width: none;
  width: fit-content;
  max-width: 100%;
  margin: 0 auto;
  border: 1px solid rgba(255, 255, 255, 0.38);
  background:
    linear-gradient(180deg, rgba(248, 251, 255, 0.34) 0%, rgba(231, 239, 255, 0.14) 58%, rgba(215, 227, 245, 0.1) 100%),
    rgba(228, 236, 249, 0.2);
  backdrop-filter: saturate(160%) blur(22px);
  -webkit-backdrop-filter: saturate(160%) blur(22px);
  transition: transform 180ms cubic-bezier(0.22, 0.8, 0.22, 1);
}

.dock-surface::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  pointer-events: none;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.58) 0%, rgba(255, 255, 255, 0.12) 30%, rgba(255, 255, 255, 0) 56%);
  box-shadow:
    0 1px 0 rgba(255, 255, 255, 0.6) inset,
    0 -1px 0 rgba(148, 163, 184, 0.22) inset;
}

.dock-surface::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  pointer-events: none;
  background: radial-gradient(125% 100% at 50% 112%, rgba(15, 23, 42, 0.3) 0%, rgba(15, 23, 42, 0) 56%);
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
  position: relative;
  overflow: hidden;
  box-shadow:
    0 8px 20px rgba(15, 23, 42, 0.26),
    0 1px 0 rgba(255, 255, 255, 0.34) inset;
  transition: transform 170ms cubic-bezier(0.22, 0.8, 0.22, 1);
  will-change: transform;
}

.dock-icon::before {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.42) 0%, rgba(255, 255, 255, 0.08) 42%, rgba(255, 255, 255, 0) 72%);
}

.dock-trash {
  background: linear-gradient(180deg, rgba(248, 250, 252, 0.34) 0%, rgba(203, 213, 225, 0.24) 100%);
}

.dock-divider {
  width: 1px;
  height: 2.4rem;
  margin: 0 0.4rem;
  border-radius: 999px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.5) 0%, rgba(148, 163, 184, 0.4) 100%);
}

.dock-open-indicator {
  position: absolute;
  left: 50%;
  bottom: -0.35rem;
  width: 0.32rem;
  height: 0.32rem;
  border-radius: 999px;
  transform: translateX(-50%);
  background: rgba(241, 245, 249, 0.92);
  box-shadow: 0 0 8px rgba(248, 250, 252, 0.75);
}

.dock-tooltip {
  z-index: 100;
  border: 1px solid rgba(255, 255, 255, 0.35);
  background: rgba(15, 23, 42, 0.8);
  color: rgba(248, 250, 252, 0.96);
  backdrop-filter: blur(8px);
}

.dock-trash-badge {
  position: absolute;
  top: -0.46rem;
  right: -0.46rem;
  min-width: 1rem;
  height: 1rem;
  padding: 0 0.25rem;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.45);
  background: linear-gradient(180deg, #fb7185 0%, #e11d48 100%);
  color: #fff;
  font-size: 10px;
  line-height: 0.9rem;
  text-align: center;
  font-weight: 700;
  box-shadow: 0 4px 10px rgba(225, 29, 72, 0.38);
}

.dock-reflection {
  position: absolute;
  left: 8%;
  right: 8%;
  bottom: -0.42rem;
  height: 0.78rem;
  border-radius: 999px;
  pointer-events: none;
  background: radial-gradient(50% 100% at 50% 0%, rgba(248, 250, 252, 0.34) 0%, rgba(248, 250, 252, 0) 100%);
  filter: blur(0.5px);
}

.dock-scroll-fade {
  display: none;
}

@media (max-width: 767px) {
  .dock-container {
    left: 0;
    right: 0;
    transform: none;
    width: 100%;
    max-width: none;
    padding: 0 0.5rem;
    bottom: max(0.35rem, calc(env(safe-area-inset-bottom) * 0.18 + 0.12rem));
  }

  .dock {
    width: 100%;
    max-width: none;
    overflow-x: auto;
    overflow-y: visible;
    justify-content: flex-start;
    gap: 0.55rem;
    padding: 0.8rem 0.65rem calc(0.55rem + env(safe-area-inset-bottom) * 0.2);
    border-radius: 1.1rem;
    -webkit-overflow-scrolling: touch;
  }

  .dock-item {
    min-height: 3.1rem;
    display: flex;
    align-items: flex-end;
  }

  .dock-icon {
    width: clamp(2.7rem, 10.8vw, 3rem);
    height: clamp(2.7rem, 10.8vw, 3rem);
    border-radius: 0.94rem;
  }

  .dock-icon > span {
    font-size: clamp(1.18rem, 4.3vw, 1.3rem);
  }

  .dock-item:active .dock-icon {
    transform: translateY(-2px) scale(0.97);
  }

  .dock-item:active .dock-icon > span {
    transform: translateY(0) scale(0.95);
  }

  .tooltip {
    display: none;
  }

  .dock-reflection {
    display: none;
  }

  .dock-scroll-fade {
    display: block;
    position: absolute;
    z-index: 60;
    pointer-events: none;
    top: 0.35rem;
    bottom: max(0.35rem, env(safe-area-inset-bottom) * 0.12);
    width: 1.1rem;
    border-radius: 0.75rem;
  }

  .dock-scroll-fade-left {
    left: 0.5rem;
    background: linear-gradient(to right, rgba(8, 12, 22, 0.86), rgba(8, 12, 22, 0));
  }

  .dock-scroll-fade-right {
    right: 0.5rem;
    background: linear-gradient(to left, rgba(8, 12, 22, 0.86), rgba(8, 12, 22, 0));
  }
}

@media (hover: none) {
  .dock-icon > span {
    transition: transform 120ms ease-out;
  }
}
</style>
