<script setup lang="ts">
import type { PortfolioItem } from '#shared/types/admin'

const { t, locale } = useI18n()

useSeoPage({
  titleKey: 'portfolio.seo.title',
  descriptionKey: 'portfolio.seo.description',
})

// Published items only (RLS), managed from the dashboard.
const { data } = await useFetch<PortfolioItem[]>('/api/public/portfolio', {
  key: 'public-portfolio',
  default: () => [],
})

const items = computed(() =>
  (data.value ?? []).map((item) => {
    const ar = locale.value === 'ar'
    return {
      id: item.id,
      title: ar ? item.title_ar : item.title_en,
      description: (ar ? item.description_ar : item.description_en) ?? '',
      category: item.category ? (ar ? item.category.name_ar : item.category.name_en) : '',
      imageUrl: item.image_url,
    }
  })
)
</script>

<template>
  <div>
    <section class="max-w-3xl mx-auto px-4 pt-16 pb-10 text-center">
      <h1 class="text-3xl font-heading font-semibold">{{ t('portfolio.hero.title') }}</h1>
      <p class="mt-4 text-neutral-600">{{ t('portfolio.hero.subtitle') }}</p>
    </section>

    <section class="max-w-5xl mx-auto px-4 pb-16">
      <p v-if="!items.length" class="text-center text-neutral-500">{{ t('portfolio.empty') }}</p>
      <div v-else class="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <article v-for="item in items" :key="item.id" class="rounded-lg border border-divider overflow-hidden bg-surface">
          <img
            v-if="item.imageUrl"
            :src="item.imageUrl"
            :alt="item.title"
            loading="lazy"
            decoding="async"
            class="aspect-[16/9] w-full object-cover"
          >
          <PlaceholderImage v-else :alt="item.title" class="aspect-[16/9] w-full" />
          <div class="p-5">
            <span v-if="item.category" class="text-xs text-accent-600">{{ item.category }}</span>
            <h2 class="font-heading font-semibold mt-1 mb-1">{{ item.title }}</h2>
            <p class="text-sm text-neutral-600">{{ item.description }}</p>
          </div>
        </article>
      </div>
    </section>
  </div>
</template>
