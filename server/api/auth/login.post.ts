/**
 * POST /api/auth/login — step 1 of admin sign-in (email + password).
 * On success sets httpOnly session cookies at AAL1 and tells the page
 * which 2FA step comes next. Any failure returns the same generic error,
 * so the response never reveals whether an email is registered.
 */
export default defineEventHandler(async (event) => {
  assertSameOrigin(event)
  assertSmallBody(event, 4 * 1024)
  const { email, password } = parseOr400(loginSchema, await readBody(event))

  // Tight limit: slows password guessing. Supabase Auth also rate-limits.
  await enforceRateLimit(event, 'admin_login', { max: 5, windowMinutes: 15 })

  const { data, error } = await createAuthClient().auth.signInWithPassword({ email, password })
  if (error || !data.session || !data.user) {
    throw createError({ statusCode: 401, statusMessage: 'invalid_credentials' })
  }

  // A valid Supabase account that isn't an admin gets the same answer as
  // a wrong password, and no session is kept.
  if (!(await isAdminUser(data.user.id))) {
    throw createError({ statusCode: 401, statusMessage: 'invalid_credentials' })
  }

  setSessionCookies(event, data.session)
  const hasVerifiedFactor = (data.user.factors ?? []).some(
    (f) => f.factor_type === 'totp' && f.status === 'verified'
  )
  return { stage: hasVerifiedFactor ? 'mfa_verify' : 'mfa_enroll' }
})
