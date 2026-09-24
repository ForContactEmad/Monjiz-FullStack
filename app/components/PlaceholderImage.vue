<script setup lang="ts">
/**
 * Generic placeholder for any spot in the design that expects a real
 * photo/image later. Pure inline SVG — no external request, no fake
 * stock photo implying content that doesn't exist yet. Swap the parent
 * for a real <NuxtImg> once actual images are chosen; `alt` is kept
 * wired now via role="img"/aria-label so it isn't forgotten later.
 */
defineProps<{ alt: string }>()
</script>

<template>
  <div
    class="bg-accent-100 flex items-center justify-center"
    role="img"
    :aria-label="alt"
  >
    <svg
      viewBox="0 0 24 24"
      class="w-10 h-10 text-accent-400"
      fill="none"
      stroke="currentColor"
      stroke-width="1.5"
      aria-hidden="true"
    >
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor" stroke="none" />
      <path d="M21 15l-5-5L5 21" stroke-linejoin="round" stroke-linecap="round" />
    </svg>
  </div>
</template>
