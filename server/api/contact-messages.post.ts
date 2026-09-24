/**
 * POST /api/contact-messages — the "Contact us" form.
 * Body: JSON matching contactMessageSchema (server/utils/validation.ts).
 */
export default defineEventHandler(async (event) => {
  assertSmallBody(event)
  const body = parseOr400(contactMessageSchema, await readBody(event))

  // Honeypot filled in: a bot. Pretend success, store nothing.
  if (body.website) return { ok: true }

  await enforceRateLimit(event, 'contact_message', { max: 5, windowMinutes: 60 })

  const { error } = await useSupabaseAdmin().from('contact_messages').insert({
    full_name: body.fullName,
    email: body.email,
    message: body.message,
    consent_privacy: true,
  })
  if (error) {
    console.error('[contact-messages] insert failed', error.message)
    throw createError({ statusCode: 500, statusMessage: 'server_error' })
  }

  await notifyAdmin('Monjiz: new contact message', 'A new contact message is waiting in the dashboard.')

  setResponseStatus(event, 201)
  return { ok: true }
})
