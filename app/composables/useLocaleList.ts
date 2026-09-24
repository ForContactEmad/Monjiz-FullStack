/** Whatever rt() accepts: a raw locale leaf as returned by tm(). */
type RawMessage = Parameters<ReturnType<typeof useI18n>['rt']>[0]

/**
 * Reads an array of objects from the locale files and resolves every
 * field to a plain string, reactive to locale changes.
 *
 *   const steps = useLocaleList('home.howItWorks.steps', ['title', 'description'])
 *   // -> ComputedRef<{ title: string; description: string }[]>
 *
 * Why this exists: tm() returns raw locale nodes whose leaves are compiled
 * message functions, not strings. Rendering them directly prints
 * "[object Object]"; each leaf has to go through rt(). Doing that here,
 * once and typed, replaces the same loose copy-paste in every page.
 */
export function useLocaleList<K extends string>(key: string, fields: readonly K[]) {
  const { tm, rt } = useI18n()

  return computed(() =>
    (tm(key) as unknown as Record<K, RawMessage>[]).map(
      (item) => Object.fromEntries(fields.map((f) => [f, rt(item[f])])) as Record<K, string>
    )
  )
}
