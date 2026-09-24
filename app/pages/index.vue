<script setup lang="ts">
const { t } = useI18n()
const localePath = useLocalePath()

useSeoPage({
  titleKey: 'home.seo.title',
  descriptionKey: 'home.seo.description',
})

const steps = useLocaleList('home.howItWorks.steps', ['title', 'description'])
const whyUsItems = useLocaleList('home.whyUs.items', ['title', 'description'])

// Categories, stats and testimonials are managed in the dashboard.
const { site, categories } = await usePublicSite()

// Each stat renders only once a real value is set in the dashboard.
const stats = computed(() =>
  [
    { value: site.value.settings.orders_completed, label: t('home.stats.ordersCompleted') },
    { value: site.value.settings.years_experience, label: t('home.stats.yearsExperience') },
  ].filter((s): s is { value: number; label: string } => s.value !== null)
)
const testimonials = computed(() => site.value.testimonials)
</script>

<template>
  <div>
    <!-- Hero -->
    <section class="bg-surface border-b border-divider">
      <div class="max-w-6xl mx-auto px-4 py-14 md:py-20 grid md:grid-cols-2 gap-10 items-center">
        <div>
          <h1 class="text-3xl md:text-5xl font-heading font-bold leading-tight text-accent-800">
            {{ t('home.hero.title') }}
          </h1>
          <p class="mt-5 text-lg text-neutral-600 max-w-xl">
            {{ t('home.hero.subtitle') }}
          </p>
          <div class="mt-8 flex flex-wrap items-center gap-3">
            <NuxtLink
              :to="localePath('/services')"
              class="px-6 py-3 rounded-md bg-accent-600 text-white hover:bg-accent-700 transition-colors"
            >
              {{ t('home.hero.cta') }}
            </NuxtLink>
            <NuxtLink
              :to="localePath('/portfolio')"
              class="px-6 py-3 rounded-md border border-accent-300 text-accent-700 hover:bg-accent-100 transition-colors"
            >
              {{ t('home.hero.ctaSecondary') }}
            </NuxtLink>
          </div>
        </div>
        <div class="rounded-lg overflow-hidden aspect-[4/3]">
          <PlaceholderImage :alt="t('home.hero.imageAlt')" class="w-full h-full" />
        </div>
      </div>
    </section>

    <!-- Stats (hidden until real numbers are set) -->
    <section v-if="stats.length" class="max-w-6xl mx-auto px-4 pt-12">
      <div class="flex flex-wrap justify-center gap-12 text-center">
        <div v-for="stat in stats" :key="stat.label">
          <p class="text-4xl font-heading font-bold text-accent-600">{{ stat.value }}</p>
          <p class="text-sm text-neutral-600">{{ stat.label }}</p>
        </div>
      </div>
    </section>

    <!-- Categories -->
    <section class="py-16">
      <div class="max-w-6xl mx-auto px-4">
        <div class="flex items-end justify-between mb-8">
          <h2 class="text-2xl md:text-3xl font-heading font-bold">{{ t('home.categories.title') }}</h2>
          <NuxtLink :to="localePath('/services')" class="text-sm text-accent-600 hover:underline">
            {{ t('home.categories.viewAll') }}
          </NuxtLink>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <NuxtLink
            v-for="category in categories"
            :key="category.slug"
            :to="localePath('/services')"
            class="group rounded-lg bg-surface p-6 border border-divider hover:border-accent-400 transition-colors"
          >
            <span class="block w-10 h-1 rounded-sm bg-accent-600 mb-4 group-hover:w-16 transition-all" />
            <h3 class="font-heading font-bold mb-1">{{ category.title }}</h3>
            <p class="text-sm text-neutral-600">{{ category.description }}</p>
          </NuxtLink>
        </div>
      </div>
    </section>

    <!-- How it works (a real sequence, so numbered) -->
    <section class="bg-accent-600 text-white py-16">
      <div class="max-w-6xl mx-auto px-4">
        <h2 class="text-2xl md:text-3xl font-heading font-bold mb-10">{{ t('home.howItWorks.title') }}</h2>
        <ol class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          <li v-for="(step, i) in steps" :key="step.title">
            <span class="block text-4xl font-heading font-bold text-accent-200">{{ i + 1 }}</span>
            <h3 class="font-heading font-bold mt-2 mb-1">{{ step.title }}</h3>
            <p class="text-sm text-accent-100">{{ step.description }}</p>
          </li>
        </ol>
      </div>
    </section>

    <!-- Why us -->
    <section class="py-16">
      <div class="max-w-6xl mx-auto px-4">
        <h2 class="text-2xl md:text-3xl font-heading font-bold mb-8">{{ t('home.whyUs.title') }}</h2>
        <dl class="grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-6">
          <div v-for="item in whyUsItems" :key="item.title" class="border-s-2 border-accent-400 ps-4">
            <dt class="font-heading font-bold">{{ item.title }}</dt>
            <dd class="text-sm text-neutral-600 mt-1">{{ item.description }}</dd>
          </div>
        </dl>
      </div>
    </section>

    <!-- Testimonials (hidden until real reviews are added) -->
    <section v-if="testimonials.length" class="bg-surface py-16 border-y border-divider">
      <div class="max-w-6xl mx-auto px-4">
        <h2 class="text-2xl md:text-3xl font-heading font-bold mb-8">{{ t('home.testimonials.title') }}</h2>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-5">
          <figure
            v-for="review in testimonials"
            :key="review.id"
            class="rounded-lg bg-bg p-6"
          >
            <blockquote class="text-neutral-700">{{ review.text }}</blockquote>
            <figcaption class="mt-4 text-sm font-medium text-accent-700">{{ review.name }}</figcaption>
          </figure>
        </div>
      </div>
    </section>

    <!-- Final CTA -->
    <section class="py-16">
      <div class="max-w-3xl mx-auto px-4 text-center rounded-lg bg-accent-100 py-12">
        <h2 class="text-2xl md:text-3xl font-heading font-bold text-accent-800">{{ t('home.finalCta.title') }}</h2>
        <p class="mt-2 text-neutral-600">{{ t('home.finalCta.subtitle') }}</p>
        <NuxtLink
          :to="localePath('/services')"
          class="mt-6 inline-block px-6 py-3 rounded-md bg-accent-600 text-white hover:bg-accent-700 transition-colors"
        >
          {{ t('home.finalCta.cta') }}
        </NuxtLink>
      </div>
    </section>
  </div>
</template>
