<template>
<div class="trash-panel h-full overflow-auto p-5 md:p-6 text-slate-100">
    <div class="mx-auto max-w-3xl">
      <div class="trash-head">
        <div>
          <h2 class="text-lg font-semibold">废纸篓</h2>
    <p class="text-xs text-slate-300">这里是已移除的桌面快捷方式</p>
        </div>
        <button class="trash-btn danger" :disabled="!store.trashCount" @click="store.emptyTrash()">清空废纸篓</button>
      </div>

      <div v-if="!store.trashedApps.length" class="trash-empty">
        <div class="text-4xl">🗑️</div>
        <p>废纸篓是空的</p>
      </div>

      <div v-else class="trash-list">
        <article v-for="app in store.trashedApps" :key="app.id" class="trash-item">
          <div class="trash-item-main">
            <div class="trash-icon" :style="{ backgroundColor: app.color }">{{ app.icon }}</div>
            <div>
              <p class="font-semibold">{{ app.name }}</p>
            <p class="text-xs text-slate-300">{{ app.description }}</p>
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
  border: 1px dashed rgba(148, 163, 184, 0.35);
  border-radius: 14px;
  padding: 28px;
  display: grid;
  justify-items: center;
  gap: 8px;
  color: rgb(100 116 139);
}

.trash-list {
  display: grid;
  gap: 10px;
}

.trash-item {
  border-radius: 12px;
  border: 1px solid rgba(148, 163, 184, 0.22);
  background: rgba(30, 41, 59, 0.45);
  padding: 10px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
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
  color: white;
  font-size: 18px;
}

.trash-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.trash-btn {
  border-radius: 9px;
  border: 1px solid rgba(148, 163, 184, 0.3);
  background: rgba(15, 23, 42, 0.58);
  color: rgb(226 232 240);
  padding: 6px 10px;
  font-size: 12px;
  font-weight: 600;
}

.trash-btn:hover:not(:disabled) {
  border-color: rgba(56, 189, 248, 0.5);
}

.trash-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.trash-btn.danger {
  color: rgb(254 205 211);
}
</style>
