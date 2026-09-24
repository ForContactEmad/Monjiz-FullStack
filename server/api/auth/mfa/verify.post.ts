/**
 * POST /api/auth/mfa/verify — the 6-digit code from the authenticator app.
 * Works for both first-time setup (activates the pending factor) and every
 * later sign-in. On success the session is upgraded to AAL2 and the
 * cookies are replaced.
 */
export default defineEventHandler(async (event) => {
  assertSameOrigin(event)
  assertSmallBody(event, 1024)
  const { code } = parseOr400(mfaVerifySchema, await readBody(event))

  const stage = await getAuthStage(event)
  if (stage !== 'mfa_verify' && stage !== 'mfa_enroll') {
    throw createError({ statusCode: 409, statusMessage: 'wrong_stage' })
  }
  // 5 tries per 15 minutes: a 6-digit code must not be brute-forceable.
  await enforceRateLimit(event, 'admin_mfa', { max: 5, windowMinutes: 15 })

  const session = (await resolveSession(event))!
  const client = await createSessionClient(session)
  const { data: factors } = await client.auth.mfa.listFactors()
  const wanted = stage === 'mfa_verify' ? 'verified' : 'unverified'
  const factor = (factors?.all ?? []).find((f) => f.factor_type === 'totp' && f.status === wanted)
  if (!factor) throw createError({ statusCode: 409, statusMessage: 'wrong_stage' })

  const { data, error } = await client.auth.mfa.challengeAndVerify({ factorId: factor.id, code })
  if (error || !data) throw createError({ statusCode: 401, statusMessage: 'invalid_code' })

  setSessionCookies(event, data)
  return { stage: 'ok' as const }
})
