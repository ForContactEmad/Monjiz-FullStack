import type { ClientProfile } from '#shared/types/client'

/**
 * The signed-in client (or null). Shared across components through one
 * keyed request, and refreshable after sign-in/out.
 */
export async function useClientAccount() {
  const { data, refresh } = await useFetch<{ profile: ClientProfile | null }>('/api/client/session', {
    key: 'client-session',
    default: () => ({ profile: null }),
  })
  const profile = computed(() => data.value?.profile ?? null)
  return { profile, refresh }
}

const KNOWN = ['email_taken', 'invalid_credentials', 'rate_limited']

/** Maps an API error code to an account.errors.* message key. */
export function accountErrorKey(err: unknown): string {
  const e = err as { statusMessage?: string; data?: { statusMessage?: string } }
  const code = e?.data?.statusMessage ?? e?.statusMessage ?? ''
  return KNOWN.includes(code) ? `account.errors.${code}` : 'account.errors.generic'
}
