<script setup lang="ts">
const props = defineProps<{ page: number; total: number; pageSize: number }>()
const emit = defineEmits<{ change: [page: number] }>()
const { t } = useI18n()
const pages = computed(() => Math.max(1, Math.ceil(props.total / props.pageSize)))
</script>

<template>
  <nav v-if="pages > 1" class="flex items-center justify-between gap-3 text-sm" aria-label="pagination">
    <button
      type="button"
      class="px-3 py-1.5 rounded-sm border border-divider disabled:opacity-40"
      :disabled="props.page <= 1"
      @click="emit('change', props.page - 1)"
    >
      {{ t('dashboard.pagination.prev') }}
    </button>
    <span class="text-neutral-600">{{ t('dashboard.pagination.page', { page: props.page, pages }) }}</span>
    <button
      type="button"
      class="px-3 py-1.5 rounded-sm border border-divider disabled:opacity-40"
      :disabled="props.page >= pages"
      @click="emit('change', props.page + 1)"
    >
      {{ t('dashboard.pagination.next') }}
    </button>
  </nav>
</template>
