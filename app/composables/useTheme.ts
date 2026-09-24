export type Theme = 'light' | 'dark'

const STORAGE_KEY = 'monjiz-theme' // renamed from the original design's `mirfaq-theme`

/**
 * Reactive light/dark theme, synced to `<html data-theme>` and localStorage.
 * The initial value on first paint is set by a blocking head script
 * (see nuxt.config.ts) so there is no flash of the wrong theme — this
 * composable picks up that already-applied value and keeps it reactive
 * for the rest of the session.
 */
export function useTheme() {
  const theme = useState<Theme>('theme', () => 'light')

  function apply(next: Theme) {
    theme.value = next
    if (import.meta.client) {
      document.documentElement.setAttribute('data-theme', next)
      try {
        localStorage.setItem(STORAGE_KEY, next)
      } catch {
        // localStorage can throw in private-browsing / storage-disabled
        // contexts — the theme still applies for this page view, it just
        // won't persist. Not worth surfacing to the user.
      }
    }
  }

  function toggle() {
    apply(theme.value === 'dark' ? 'light' : 'dark')
  }

  onMounted(() => {
    const current = document.documentElement.getAttribute('data-theme') as Theme | null
    if (current) theme.value = current
  })

  return { theme: readonly(theme), setTheme: apply, toggleTheme: toggle }
}
