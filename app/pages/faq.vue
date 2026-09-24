<script setup lang="ts">
const { t } = useI18n()

useSeoPage({
  titleKey: 'faq.seo.title',
  descriptionKey: 'faq.seo.description',
})

const items = useLocaleList('faq.items', ['question', 'answer'])
</script>

<template>
  <div class="max-w-3xl mx-auto px-4 py-16">
    <h1 class="text-3xl font-heading font-semibold text-center mb-10">
      {{ t('faq.hero.title') }}
    </h1>

    <div class="space-y-3">
      <!--
        Native <details>/<summary> — accessible and keyboard-operable with
        zero JS, no accordion library needed for a list this size.
      -->
      <details
        v-for="item in items"
        :key="item.question"
        class="group rounded-lg border border-divider bg-surface px-5 py-4"
      >
        <summary class="cursor-pointer list-none flex items-center justify-between font-heading font-semibold">
          {{ item.question }}
          <span class="text-accent-600 transition-transform group-open:rotate-45 text-xl leading-none">+</span>
        </summary>
        <p class="mt-3 text-sm text-neutral-600 leading-relaxed">{{ item.answer }}</p>
      </details>
    </div>
  </div>
</template>
