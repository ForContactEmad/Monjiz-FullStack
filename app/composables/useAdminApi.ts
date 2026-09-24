/**
 * Fetch wrapper for /api/admin and /api/auth calls from dashboard pages.
 * A 401 means the session expired or 2FA is missing: send the admin back
 * through sign-in instead of showing a broken page.
 */
export function useAdminApi() {
  const localePath = useLocalePath()

  async function request<T>(url: string, options: Parameters<typeof $fetch>[1] = {}): Promise<T> {
    try {
      return (await $fetch(url, options as never)) as T
    } catch (err) {
      if ((err as { statusCode?: number })?.statusCode === 401) {
        await navigateTo(localePath('/dashboard/login'))
      }
      throw err
    }
  }

  return { request }
}

const KNOWN_ERRORS = ['invalid_credentials', 'invalid_code', 'rate_limited', 'wrong_stage', 'slug_taken', 'invalid_image']

/** Maps an API error code to a dashboard.errors.* message key. */
export function adminErrorKey(err: unknown): string {
  const e = err as { statusMessage?: string; data?: { statusMessage?: string } }
  const code = e?.data?.statusMessage ?? e?.statusMessage ?? ''
  return KNOWN_ERRORS.includes(code) ? `dashboard.errors.${code}` : 'dashboard.errors.generic'
}
