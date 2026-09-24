/** POST /api/auth/logout — revokes the session at Supabase and clears cookies. */
export default defineEventHandler(async (event) => {
  assertSameOrigin(event)
  const session = await resolveSession(event)
  if (session) {
    try {
      const client = await createSessionClient(session)
      await client.auth.signOut({ scope: 'local' })
    } catch {
      // Cookies are cleared below regardless; the refresh token is revoked
      // or will expire on its own.
    }
  }
  clearSessionCookies(event)
  return { ok: true }
})
