<template>
  <nav class="dock-container" aria-label="程序坞" :class="{ 'dock-dark': store.settings.surfaceTheme === 'midnight' }" :style="{ '--dock-size': `${iconSize}px` }">
    <div ref="dockRef" class="dock dock-surface" :class="{ 'is-overflowing': hasDockOverflow }" @mousemove="handleMouseMove" @mouseleave="clearMagnification" @scroll="updateScrollHints">
      <button
        v-for="(app, index) in dockApps"
        :key="app.id"
        type="button"
        role="button"
        class="dock-item"
        :style="getItemStyle(index)"
        :aria-label="`打开 ${app.name}`"
        @click="store.openWindow(app.id)"
      >
        <span class="dock-icon" :class="`dock-icon-${app.id}`" :style="{ '--app-color': app.color }">
          <IconGlyph :name="app.id" :size="iconSize * 0.64" />
        </span>
        <span v-if="isAppOpen(app.id)" class="dock-open-indicator" aria-hidden="true" />
        <span class="dock-tooltip" role="tooltip">{{ app.name }}</span>
      </button>
      <div class="dock-divider" aria-hidden="true" />
      <button type="button" role="button" class="dock-item" :style="getItemStyle(dockApps.length)" aria-label="打开废纸篓" @click="store.openTrashWindow()">
        <span class="dock-icon dock-trash"><IconGlyph name="trash" :size="iconSize * 0.64" /></span>
        <span v-if="store.trashCount > 0" class="dock-trash-badge">{{ store.trashCount }}</span>
        <span class="dock-tooltip" role="tooltip">废纸篓</span>
      </button>
    </div>
    <span v-show="canScrollLeft" class="dock-scroll-fade dock-scroll-fade-left" aria-hidden="true" />
    <span v-show="canScrollRight" class="dock-scroll-fade dock-scroll-fade-right" aria-hidden="true" />
  </nav>
</template>

<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useDesktopStore } from '../../stores/desktop.js'
import IconGlyph from './IconGlyph.vue'

const store = useDesktopStore()
const dockRef = ref(null)
const pointerX = ref(null)
const canScrollLeft = ref(false)
const canScrollRight = ref(false)
const hasDockOverflow = ref(false)
const viewportWidth = ref(window.innerWidth)
const hoverQuery = window.matchMedia('(hover: hover)')
const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
const canAnimate = ref(hoverQuery.matches && !reducedMotionQuery.matches)
const dockAppIds = ['settings', 'ip-check', 'terminal', 'tools', 'github']
const dockApps = computed(() => [...new Set([
  ...dockAppIds,
  ...store.windows.map(item => item.appId).filter(id => id !== 'trash'),
])].map(id => store.desktopApps.find(app => app.id === id)).filter(Boolean))
const iconSize = computed(() => ({ small: 40, medium: 48, large: 56 })[store.settings.iconSize] || 48)
const magnification = computed(() => ({ low: 0.28, medium: 0.48, high: 0.65 })[store.settings.dockAnimationLevel] || 0.48)
// Reference centers stay at rest so magnification never feeds its moving layout back into itself.
const restWidth = computed(() => (dockApps.value.length + 1) * (iconSize.value + 6) + 13)
const clearMagnification = () => { pointerX.value = null }

const getItemStyle = (index) => {
  let scale = 1
  if (canAnimate.value && !hasDockOverflow.value && pointerX.value !== null && viewportWidth.value > restWidth.value + 190) {
    const center = -restWidth.value / 2 + iconSize.value / 2 + index * (iconSize.value + 6) + (index === dockApps.value.length ? 19 : 0)
    const distance = Math.abs(pointerX.value - center)
    if (distance < 150) scale += (1 + Math.cos(Math.PI * distance / 150)) / 2 * magnification.value
  }
  return { width: `${iconSize.value * scale}px`, '--dock-scale': scale }
}

const handleMouseMove = (event) => {
  if (!canAnimate.value) return
  const rect = dockRef.value.getBoundingClientRect()
  pointerX.value = event.clientX - (rect.left + rect.width / 2)
}
const isAppOpen = appId => store.windows.some(item => item.appId === appId)

const updateScrollHints = () => {
  if (!dockRef.value) return
  const element = dockRef.value
  hasDockOverflow.value = element.scrollWidth - element.clientWidth > 2
  canScrollLeft.value = hasDockOverflow.value && element.scrollLeft > 6
  canScrollRight.value = hasDockOverflow.value && element.scrollLeft + element.clientWidth < element.scrollWidth - 6
}
const handleResize = () => {
  viewportWidth.value = window.innerWidth
  clearMagnification()
  nextTick(updateScrollHints)
}
const updateMotionPreference = () => {
  canAnimate.value = hoverQuery.matches && !reducedMotionQuery.matches
  clearMagnification()
}
onMounted(() => {
  updateScrollHints()
  window.addEventListener('resize', handleResize)
  hoverQuery.addEventListener?.('change', updateMotionPreference)
  reducedMotionQuery.addEventListener?.('change', updateMotionPreference)
})
onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  hoverQuery.removeEventListener?.('change', updateMotionPreference)
  reducedMotionQuery.removeEventListener?.('change', updateMotionPreference)
})
watch(() => [dockApps.value.length, store.settings.iconSize], () => {
  clearMagnification()
  nextTick(updateScrollHints)
})
</script>

<style scoped>
.dock-container {
  position: fixed;
  z-index: 50;
  bottom: max(8px, env(safe-area-inset-bottom));
  left: 50%;
  max-width: calc(100vw - 20px);
  transform: translateX(-50%);
  --dock-glass: rgba(236, 236, 241, 0.35);
  --dock-label: rgba(245, 245, 247, 0.94);
  --dock-text: #242426;
}
.dock {
  display: flex;
  align-items: flex-end;
  gap: 6px;
  position: relative;
  width: max-content;
  max-width: 100%;
  height: calc(var(--dock-size) + 21px);
  padding: 8px 9px 11px;
  border: 1px solid rgba(255, 255, 255, 0.28);
  border-radius: 17px;
  background: var(--dock-glass);
  box-shadow: 0 8px 28px rgba(0, 0, 0, 0.22), inset 0 0 0 1px rgba(255, 255, 255, 0.09);
  backdrop-filter: blur(28px) saturate(150%);
  -webkit-backdrop-filter: blur(28px) saturate(150%);
  scrollbar-width: none;
}
.dock::-webkit-scrollbar { display: none; }
.dock-item {
  display: flex;
  position: relative;
  align-items: flex-end;
  justify-content: center;
  flex: 0 0 auto;
  height: var(--dock-size);
  padding: 0;
  border: 0;
  background: transparent;
  cursor: default;
  transition: width 120ms ease-out;
}
.dock-icon {
  display: grid;
  flex: 0 0 var(--dock-size);
  width: var(--dock-size);
  height: var(--dock-size);
  place-items: center;
  border-radius: 23%;
  color: #fff;
  background: linear-gradient(rgba(255, 255, 255, 0.18), rgba(0, 0, 0, 0.08)), var(--app-color, #8a909b);
  box-shadow: inset 0 1px 1px rgba(255, 255, 255, 0.45), inset 0 -1px 1px rgba(0, 0, 0, 0.16), 0 2px 3px rgba(0, 0, 0, 0.22);
  transform: scale(var(--dock-scale, 1));
  transform-origin: center bottom;
  transition: transform 120ms ease-out, filter 120ms;
}
.dock-icon-settings { background: linear-gradient(#c6c8ce, #858993); color: #f4f4f6; }
.dock-icon-terminal { background: linear-gradient(#34363b, #121316); box-shadow: inset 0 0 0 2px #9da1a9, 0 2px 3px #0003; }
.dock-icon-github { background: linear-gradient(#45474d, #18191c); }
.dock-trash { background: linear-gradient(#ecedf1, #b9bdc6); color: #666d79; }
.dock-item:active .dock-icon { filter: brightness(0.75); }
.dock-item:focus-visible { outline: none; }
.dock-item:focus-visible .dock-icon { outline: 3px solid #007aff; outline-offset: 3px; }
.dock-divider { flex: 0 0 1px; height: calc(var(--dock-size) - 4px); margin: 2px 6px; background: rgba(60, 60, 67, 0.24); }
.dock-open-indicator { position: absolute; bottom: -7px; left: calc(50% - 2px); width: 4px; height: 4px; border-radius: 50%; background: var(--dock-text); }
.dock-tooltip {
  position: absolute;
  bottom: calc(var(--dock-size) * var(--dock-scale, 1) + 11px);
  left: 50%;
  z-index: 1;
  padding: 4px 10px;
  border: 1px solid rgba(0, 0, 0, 0.12);
  border-radius: 6px;
  color: var(--dock-text);
  background: var(--dock-label);
  box-shadow: 0 3px 9px #0002;
  font: 12px/1.5 -apple-system, BlinkMacSystemFont, 'PingFang SC', sans-serif;
  white-space: nowrap;
  transform: translateX(-50%);
  visibility: hidden;
  pointer-events: none;
}
.dock-item:hover .dock-tooltip,.dock-item:focus-visible .dock-tooltip { visibility: visible; }
.dock-trash-badge { position: absolute; top: -4px; right: -4px; min-width: 16px; padding: 0 4px; border: 1px solid #fff9; border-radius: 12px; background: #ff453a; color: #fff; font: 10px/15px sans-serif; }
.dock.is-overflowing { overflow-x: auto; }
.dock.is-overflowing .dock-tooltip { display: none; }
.dock-scroll-fade { position: absolute; top: 1px; bottom: 1px; width: 15px; border-radius: 16px; pointer-events: none; }
.dock-scroll-fade-left { left: 1px; background: linear-gradient(90deg, #a1a1aa, transparent); }
.dock-scroll-fade-right { right: 1px; background: linear-gradient(-90deg, #a1a1aa, transparent); }
.dock-dark { --dock-glass: rgba(39, 39, 43, 0.48); --dock-label: rgba(48, 48, 51, 0.96); --dock-text: #f5f5f7; }
.dock-dark .dock-divider { background: #ffffff38; }
@media (hover: none) {
  .dock-tooltip { display: none; }
}
@media (prefers-reduced-motion: reduce) {
  .dock-item,.dock-icon { transition: none; }
}
@media (prefers-reduced-transparency: reduce) {
  .dock { background: #dddde1; backdrop-filter: none; -webkit-backdrop-filter: none; }
  .dock-dark .dock { background: #333336; }
}
</style>
