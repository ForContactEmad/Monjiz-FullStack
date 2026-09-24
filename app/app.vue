<script setup lang="ts">
const { locale, locales } = useI18n()

// Keep <html lang/dir> in sync with the active locale on every navigation —
// the value in nuxt.config.ts app.head is only the first-paint fallback.
useHead(() => {
  const current = (locales.value as { code: string; dir?: 'ltr' | 'rtl' | 'auto' }[]).find(
    (l) => l.code === locale.value
  )
  return {
    htmlAttrs: {
      lang: locale.value,
      dir: current?.dir ?? ('ltr' as const),
    },
  }
})
</script>

<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>
