/** POST /api/client/login — email + password (no 2FA for clients). */
export default defineEventHandler(async (event) => {
  assertSameOrigin(event)
  assertSmallBody(event, 4 * 1024)
  const { email, password } = parseOr400(clientLoginSchema, await readBody(event))

  await enforceRateLimit(event, 'client_login', { max: 5, windowMinutes: 15 })

  const { data, error } = await createAuthClient().auth.signInWithPassword({ email, password })
  if (error || !data.session || !data.user) {
    throw createError({ statusCode: 401, statusMessage: 'invalid_credentials' })
  }

  const { data: profile } = await useSupabaseAdmin()
    .from('client_profiles')
    .select('id')
    .eq('id', data.user.id)
    .maybeSingle()
  // The admin account must sign in through /dashboard/login, where 2FA is
  // enforced — not through this door.
  if (!profile) throw createError({ statusCode: 401, statusMessage: 'invalid_credentials' })

  setSessionCookies(event, data.session)
  return { ok: true }
})
