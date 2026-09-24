import type { AuthStage } from '#shared/types/admin'

/**
 * Route guard for every /dashboard page. Sends the browser to the step it
 * is actually at: sign-in, 2FA, or the dashboard itself.
 *
 * This is navigation convenience only. The real protection is on the
 * server (requireAdmin) and in the database (RLS) — a page reached by
 * skipping this guard still gets no data.
 */
export default defineNuxtRouteMiddleware(async (to) => {
  const localePath = useLocalePath()
  const loginPath = localePath('/dashboard/login')
  const mfaPath = localePath('/dashboard/mfa')

  const { stage } = await $fetch<{ stage: AuthStage }>('/api/auth/session')
  const onLogin = to.path === loginPath
  const onMfa = to.path === mfaPath

  if (stage === 'signed_out' && !onLogin) return navigateTo(loginPath)
  if ((stage === 'mfa_enroll' || stage === 'mfa_verify') && !onMfa) return navigateTo(mfaPath)
  if (stage === 'ok' && (onLogin || onMfa)) return navigateTo(localePath('/dashboard'))
})
