<template>
<div class="trash-panel h-full overflow-auto p-5 md:p-6 text-hud-text">
    <div class="mx-auto max-w-3xl">
      <div class="trash-head">
        <div>
          <h2 class="text-lg font-semibold">废纸篓</h2>
    <p class="text-xs text-hud-muted">这里是已移除的桌面快捷方式</p>
        </div>
        <button class="trash-btn danger" :disabled="!store.trashCount" @click="store.emptyTrash()">清空废纸篓</button>
      </div>

      <div v-if="!store.trashedApps.length" class="trash-empty">
        <IconGlyph name="trash" :size="34" />
        <p>废纸篓是空的</p>
      </div>

      <div v-else class="trash-list">
        <article v-for="app in store.trashedApps" :key="app.id" class="trash-item">
          <div class="trash-item-main">
            <div class="trash-icon" :style="{ '--app-color': app.color }">
              <IconGlyph :name="app.id" :size="20" />
            </div>
            <div>
              <p class="font-semibold">{{ app.name }}</p>
            <p class="text-xs text-hud-muted">{{ app.description }}</p>
            </div>
          </div>

          <div class="trash-actions">
            <button class="trash-btn" @click="store.restoreAppFromTrash(app.id)">还原</button>
            <button class="trash-btn danger" @click="store.deleteFromTrash(app.id)">永久删除</button>
          </div>
        </article>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useDesktopStore } from '../../stores/desktop.js'
import IconGlyph from './IconGlyph.vue'

const store = useDesktopStore()
</script>

<style scoped>
.trash-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
}

.trash-empty {
  border: 1px dashed rgba(125, 211, 252, 0.28);
  border-radius: 14px;
  padding: 28px;
  display: grid;
  justify-items: center;
  gap: 8px;
  color: var(--hud-muted);
  background: rgba(8, 14, 26, 0.32);
}

.trash-empty :deep(.icon-glyph) {
  color: rgba(125, 211, 252, 0.72);
}

.trash-list {
  display: grid;
  gap: 10px;
}

.trash-item {
  border-radius: 12px;
  border: 1px solid rgba(125, 211, 252, 0.14);
  background: rgba(8, 14, 26, 0.5);
  padding: 10px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  transition: all 0.22s var(--ease-hud);
}

.trash-item:hover {
  border-color: rgba(125, 211, 252, 0.32);
  background: rgba(17, 30, 52, 0.6);
  transform: translateY(-1px);
}

.trash-item-main {
  display: flex;
  align-items: center;
  gap: 10px;
}

.trash-icon {
  width: 34px;
  height: 34px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(248, 250, 252, 0.96);
  background:
    linear-gradient(145deg, rgba(255, 255, 255, 0.22), transparent 45%),
    var(--app-color, rgba(56, 189, 248, 0.8));
  box-shadow: 0 8px 18px rgba(2, 6, 23, 0.32);
}

.trash-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.trash-btn {
  border-radius: 9px;
  border: 1px solid var(--hud-line-strong);
  background: rgba(15, 23, 42, 0.4);
  color: rgb(226 232 240);
  padding: 6px 10px;
  font-size: 12px;
  font-weight: 600;
  transition: all 0.2s var(--ease-hud);
}

.trash-btn:hover:not(:disabled) {
  border-color: var(--hud-primary-border);
  background: var(--hud-primary-faint);
  color: var(--hud-text);
  transform: translateY(-1px);
}

.trash-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.trash-btn.danger {
  color: rgb(254 205 211);
}

.trash-btn.danger:hover:not(:disabled) {
  border-color: rgba(251, 113, 133, 0.5);
  background: rgba(244, 63, 94, 0.16);
  color: rgb(254 205 211);
}

@media (max-width: 640px) {
  .trash-item {
    flex-direction: column;
    align-items: stretch;
    gap: 8px;
  }

  .trash-actions {
    justify-content: flex-end;
  }
}

/* Liquid glass trash panel */
.trash-panel {
  color: #182235;
  background:
    radial-gradient(circle at 84% 4%, rgba(203, 222, 255, 0.4), transparent 32%),
    linear-gradient(145deg, rgba(248, 251, 255, 0.58), rgba(229, 238, 249, 0.46));
}

.trash-empty,
.trash-item {
  border-color: rgba(255, 255, 255, 0.72);
  background: rgba(255, 255, 255, 0.46);
  box-shadow: 0 14px 32px rgba(100, 119, 148, 0.1), 0 1px 0 rgba(255, 255, 255, 0.7) inset;
}

.trash-empty {
  color: #77849a;
}

.trash-empty :deep(.icon-glyph) {
  color: #6c91d2;
}

.trash-item {
  color: #26334a;
}

.trash-item:hover {
  border-color: rgba(91, 131, 206, 0.32);
  background: rgba(255, 255, 255, 0.68);
}

.trash-icon {
  border: 1px solid rgba(255, 255, 255, 0.72);
  box-shadow: 0 8px 18px rgba(76, 98, 132, 0.16), 0 1px 0 rgba(255, 255, 255, 0.64) inset;
}

.trash-btn {
  border-color: rgba(116, 133, 158, 0.22);
  background: rgba(255, 255, 255, 0.44);
  color: #344056;
}

.trash-btn:hover:not(:disabled) {
  border-color: rgba(91, 131, 206, 0.38);
  background: rgba(224, 236, 255, 0.72);
  color: #243452;
}

.trash-btn.danger {
  color: #b65060;
}

.trash-btn.danger:hover:not(:disabled) {
  border-color: rgba(200, 94, 109, 0.34);
  background: rgba(255, 226, 231, 0.72);
  color: #a84556;
}
</style>
