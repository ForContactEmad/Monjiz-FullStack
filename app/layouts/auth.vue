<script setup lang="ts">
const { t } = useI18n()
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-bg text-text px-4">
    <div class="w-full max-w-sm">
      <p class="text-center text-2xl font-heading font-bold text-accent-600 mb-6">{{ t('nav.brand') }}</p>
      <div class="rounded-lg bg-surface border border-divider p-6 shadow-md">
        <slot />
      </div>
    </div>
  </div>
</template>
