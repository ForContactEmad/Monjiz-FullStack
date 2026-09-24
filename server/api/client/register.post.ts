/**
 * POST /api/client/register — creates a client account and signs them in.
 *
 * The account is created server-side with the service_role key, so public
 * sign-up stays DISABLED in Supabase: accounts can only be created through
 * this route, which is rate limited and honeypot-protected.
 *
 * Known gap: the email address is auto-confirmed and not verified yet (it
 * needs SMTP configured). See docs/SECURITY.md §12.
 */
export default defineEventHandler(async (event) => {
  assertSameOrigin(event)
  assertSmallBody(event, 8 * 1024)
  const input = parseOr400(clientRegisterSchema, await readBody(event))

  if (input.website) return { ok: true } // bot: pretend success, create nothing

  await enforceRateLimit(event, 'client_register', { max: 3, windowMinutes: 60 })

  const admin = useSupabaseAdmin()
  const { data: created, error } = await admin.auth.admin.createUser({
    email: input.email,
    password: input.password,
    email_confirm: true,
  })
  if (error) {
    // Supabase reports an existing address; say so plainly, because the
    // person needs to know to sign in instead. (Unlike the admin login,
    // where hiding it matters more than helping.)
    if (/already|exists|registered/i.test(error.message)) {
      throw createError({ statusCode: 409, statusMessage: 'email_taken' })
    }
    console.error('[client/register] create failed', error.message)
    throw createError({ statusCode: 500, statusMessage: 'server_error' })
  }

  const { error: profileError } = await admin.from('client_profiles').insert({
    id: created.user.id,
    full_name: input.full_name,
    phone: input.phone,
    company_name: input.company_name,
  })
  if (profileError) {
    // Don't leave an account behind that can't be used.
    await admin.auth.admin.deleteUser(created.user.id)
    console.error('[client/register] profile failed', profileError.message)
    throw createError({ statusCode: 500, statusMessage: 'server_error' })
  }

  const { data: session } = await createAuthClient().auth.signInWithPassword({
    email: input.email,
    password: input.password,
  })
  if (session?.session) setSessionCookies(event, session.session)

  setResponseStatus(event, 201)
  return { ok: true }
})
