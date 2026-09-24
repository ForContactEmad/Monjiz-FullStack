/**
 * POST /api/auth/mfa/enroll — first-time 2FA setup.
 * Allowed only for a signed-in admin (AAL1) with no verified factor yet.
 * Returns the QR code (SVG data URI) and secret for an authenticator app;
 * the factor stays unverified until /api/auth/mfa/verify succeeds.
 */
export default defineEventHandler(async (event) => {
  assertSameOrigin(event)
  if ((await getAuthStage(event)) !== 'mfa_enroll') {
    throw createError({ statusCode: 409, statusMessage: 'wrong_stage' })
  }
  const session = (await resolveSession(event))!
  const client = await createSessionClient(session)

  // Remove leftovers from an abandoned earlier attempt, so a fresh QR code
  // is always issued and stale secrets don't pile up.
  const { data: factors } = await client.auth.mfa.listFactors()
  for (const f of factors?.all ?? []) {
    if (f.factor_type === 'totp' && f.status === 'unverified') {
      await client.auth.mfa.unenroll({ factorId: f.id })
    }
  }

  const { data, error } = await client.auth.mfa.enroll({ factorType: 'totp', friendlyName: 'Monjiz admin' })
  if (error || !data) {
    console.error('[mfa] enroll failed', error?.message)
    throw createError({ statusCode: 500, statusMessage: 'server_error' })
  }
  setResponseHeader(event, 'Cache-Control', 'no-store')
  return { qrCode: data.totp.qr_code, secret: data.totp.secret }
})
