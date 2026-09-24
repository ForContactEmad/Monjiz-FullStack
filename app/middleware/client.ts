/**
 * Guard for /account pages: sends visitors without a client session to the
 * sign-in page, remembering where they were headed.
 *
 * Convenience only — every /api/client route independently calls
 * requireClient(), and RLS limits each client to their own rows.
 */
export default defineNuxtRouteMiddleware(async (to) => {
  const localePath = useLocalePath()
  const { profile } = await useClientAccount()
  if (!profile.value) {
    return navigateTo({ path: localePath('/account/login'), query: { redirect: to.fullPath } })
  }
})
