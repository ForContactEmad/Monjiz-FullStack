/**
 * Locale-aware formatting. Arabic uses the Gregorian calendar with Latin
 * digits: plain "ar-SA" would switch to the Hijri calendar, which mixes
 * badly with dates stored and discussed in Gregorian.
 */
export function useFormat() {
  const { locale } = useI18n()
  const intlLocale = computed(() => (locale.value === 'ar' ? 'ar-SA-u-ca-gregory-nu-latn' : 'en-GB'))

  function date(iso: string, style: 'date' | 'datetime' = 'datetime'): string {
    const options: Intl.DateTimeFormatOptions =
      style === 'date' ? { dateStyle: 'medium' } : { dateStyle: 'medium', timeStyle: 'short' }
    return new Intl.DateTimeFormat(intlLocale.value, options).format(new Date(iso))
  }

  function bytes(n: number): string {
    if (n < 1024) return `${n} B`
    if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`
    return `${(n / 1024 / 1024).toFixed(1)} MB`
  }

  return { date, bytes }
}
