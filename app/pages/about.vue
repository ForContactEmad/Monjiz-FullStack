<script setup lang="ts">
const { t } = useI18n()

useSeoPage({
  titleKey: 'about.seo.title',
  descriptionKey: 'about.seo.description',
})

const values = useLocaleList('about.values.items', ['title', 'description'])
</script>

<template>
  <div>
    <section class="max-w-3xl mx-auto px-4 pt-16 pb-10 text-center">
      <h1 class="text-3xl font-heading font-semibold">{{ t('about.hero.title') }}</h1>
      <p class="mt-4 text-neutral-600">{{ t('about.hero.subtitle') }}</p>
    </section>

    <section class="max-w-3xl mx-auto px-4 pb-16">
      <div class="rounded-lg overflow-hidden aspect-[16/7]">
        <PlaceholderImage :alt="t('about.imageAlt')" class="w-full h-full" />
      </div>
    </section>

    <section class="max-w-3xl mx-auto px-4 pb-16">
      <h2 class="text-2xl font-heading font-semibold mb-3">{{ t('about.mission.title') }}</h2>
      <p class="text-neutral-600 leading-relaxed">{{ t('about.mission.body') }}</p>
    </section>

    <section class="bg-surface py-16">
      <div class="max-w-5xl mx-auto px-4">
        <h2 class="text-2xl font-heading font-semibold text-center mb-10">
          {{ t('about.values.title') }}
        </h2>
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div
            v-for="value in values"
            :key="value.title"
            class="rounded-lg bg-bg border border-divider p-5 text-center"
          >
            <h3 class="font-heading font-semibold mb-1">{{ value.title }}</h3>
            <p class="text-sm text-neutral-600">{{ value.description }}</p>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>
