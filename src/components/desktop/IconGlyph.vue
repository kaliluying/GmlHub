<template>
  <svg
    class="icon-glyph"
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    :stroke-width="strokeWidth"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <template v-if="name === 'tools'">
      <path d="m14.7 6.3 3-3a4.2 4.2 0 0 0-5.5 5.5l-7.1 7.1a2.1 2.1 0 1 0 3 3l7.1-7.1a4.2 4.2 0 0 0 5.5-5.5l-3 3-3-3Z" />
      <path d="m5.8 18.2 1.4-1.4" />
    </template>
    <template v-else-if="name === 'wiki'">
      <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21.5v-16Z" />
      <path d="M4 5.5v16M8 7h8M8 11h8M8 15h5" />
    </template>
    <template v-else-if="name === 'vault'">
      <rect x="4" y="10" width="16" height="11" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3" />
    </template>
    <template v-else-if="name === 'blog'">
      <path d="M5 3.5h10l4 4V20a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V4.5a1 1 0 0 1 1-1Z" />
      <path d="M14 3.5V8h5M8 12h8M8 16h6" />
    </template>
    <template v-else-if="name === 'github'">
      <path d="M15 22v-3.3c0-1.1-.4-1.9-1.1-2.3 3.7-.4 7.6-1.8 7.6-8a6.3 6.3 0 0 0-1.7-4.4 5.8 5.8 0 0 0-.1-4.3S18.3-.7 15 1.5a15 15 0 0 0-6 0C5.7-.7 4.3-.3 4.3-.3a5.8 5.8 0 0 0-.1 4.3A6.3 6.3 0 0 0 2.5 8.4c0 6.2 3.9 7.6 7.6 8-.7.4-1.1 1.2-1.1 2.3V22" />
      <path d="M7 19c-3 .9-3-1.5-4.2-1.8M7.5 21.2c-.2-.1-.4-.2-.6-.4" />
    </template>
    <template v-else-if="name === 'clipboard-history'">
      <rect x="5" y="4" width="14" height="17" rx="2" />
      <path d="M9 4.5V3h6v1.5M8.5 9h7M8.5 13h7M8.5 17h4" />
    </template>
    <template v-else-if="name === 'bilibili'">
      <rect x="3" y="6" width="18" height="13" rx="3" />
      <path d="m8 4 2-2M16 4l-2-2M9 11v3M15 11v3" />
    </template>
    <template v-else-if="name === 'terminal'">
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="m7 9 3 3-3 3M13 15h4" />
    </template>
    <template v-else-if="name === 'settings'">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-1.8 1.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-2.6V20a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1-1.8-1.8.1-.1A1.7 1.7 0 0 0 8 15a1.7 1.7 0 0 0-1.6-1H6v-2.6h.4A1.7 1.7 0 0 0 8 10a1.7 1.7 0 0 0-.3-1.9l-.1-.1 1.8-1.8.1.1a1.7 1.7 0 0 0 1.9.3 1.7 1.7 0 0 0 1-1.6v-.2H15V5a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1 1.8 1.8-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v2.6H21a1.7 1.7 0 0 0-1.6 1Z" />
    </template>
    <template v-else-if="name === 'profile'">
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20a7 7 0 0 1 14 0" />
    </template>
    <template v-else-if="name === 'contact'">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m4 7 8 6 8-6M8 16l2-2M16 16l-2-2" />
    </template>
    <template v-else-if="name === 'stack'">
      <path d="m12 3 8 4-8 4-8-4 8-4Z" />
      <path d="m4 12 8 4 8-4M4 17l8 4 8-4" />
    </template>
    <template v-else-if="name === 'trash'">
      <path d="M4 7h16M10 11v6M14 11v6M6 7l1 14h10l1-14M9 7V4h6v3" />
    </template>
    <template v-else-if="name === 'search'">
      <circle cx="10.8" cy="10.8" r="6.3" />
      <path d="m16 16 4.3 4.3" />
    </template>
    <template v-else-if="name === 'spark'">
      <path d="m12 2 1.4 6.6L20 10l-6.6 1.4L12 18l-1.4-6.6L4 10l6.6-1.4L12 2ZM19 16l.6 2.4L22 19l-2.4.6L19 22l-.6-2.4L16 19l2.4-.6L19 16Z" />
    </template>
    <template v-else-if="name === 'activity'">
      <path d="M3 12h4l2-6 4 12 2-6h6" />
    </template>
    <template v-else>
      <rect x="4" y="4" width="16" height="16" rx="3" />
      <path d="M8 9h8M8 13h5M8 17h3" />
    </template>
  </svg>
</template>

<script setup>
defineProps({
  name: {
    type: String,
    default: 'grid',
  },
  size: {
    type: [Number, String],
    default: 24,
  },
  strokeWidth: {
    type: [Number, String],
    default: 1.7,
  },
})
</script>

<style scoped>
.icon-glyph {
  display: block;
  flex: 0 0 auto;
}
</style>
