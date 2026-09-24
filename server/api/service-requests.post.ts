import { createHash, randomBytes, randomUUID } from 'node:crypto'
import { ATTACHMENTS_BUCKET } from '#shared/uploads'

/**
 * POST /api/service-requests — phase 1 of a service request.
 *
 * An account is OPTIONAL. Signed in as a client, the request is tied to
 * that account (so it can be followed and messaged about) and the name and
 * email come from the account — never from the form, so a request can't be
 * filed under someone else's identity. Without an account, the visitor
 * supplies their own name and email, exactly as before accounts existed.
 *
 * Saves the text fields. If the client declared attachments, also returns
 * one signed upload URL per file (valid for a short time, one path each)
 * plus a one-time finalize token. The browser uploads directly to the
 * private bucket, then calls POST /api/service-requests/:id/finalize.
 * Why two phases: see supabase/migrations/0004_uploads_and_rate_limits.sql.
 */
export default defineEventHandler(async (event) => {
  assertSmallBody(event)
  const body = parseOr400(serviceRequestSchema, await readBody(event))

  if (body.website) return { ok: true, requestId: null, finalizeToken: null, uploads: [] }

  // null for a guest; a profile when signed in as a client.
  const client = await getClientProfile(event)
  if (!client && (!body.fullName || !body.email)) {
    throw createError({ statusCode: 400, statusMessage: 'invalid_input' })
  }
  await enforceRateLimit(event, 'service_request', { max: 5, windowMinutes: 60 })

  const supabase = useSupabaseAdmin()

  const { data: category, error: categoryError } = await supabase
    .from('service_categories')
    .select('id')
    .eq('slug', body.categorySlug)
    .eq('is_active', true)
    .maybeSingle()
  if (categoryError) {
    console.error('[service-requests] category lookup failed', categoryError.message)
    throw createError({ statusCode: 500, statusMessage: 'server_error' })
  }
  if (!category) throw createError({ statusCode: 400, statusMessage: 'invalid_input' })

  const requestId = randomUUID()
  const hasFiles = body.files.length > 0
  const finalizeToken = hasFiles ? randomBytes(32).toString('hex') : null

  // Paths are generated here, never taken from the client.
  const pendingUploads = body.files.map((f) => ({
    path: `pending/${requestId}/${randomUUID()}`,
    name: sanitizeDisplayName(f.name),
    type: f.type,
    size: f.size,
  }))

  const { error: insertError } = await supabase.from('service_requests').insert({
    id: requestId,
    category_id: category.id,
    client_id: client?.id ?? null,
    full_name: client ? client.full_name : body.fullName!,
    email: client ? client.email : body.email!,
    phone: body.phone ?? client?.phone ?? null,
    company_name: body.companyName ?? client?.company_name ?? null,
    details: body.details,
    consent_privacy: true,
    upload_token_hash: finalizeToken ? sha256(finalizeToken) : null,
    pending_uploads: hasFiles ? pendingUploads : null,
  })
  if (insertError) {
    console.error('[service-requests] insert failed', insertError.message)
    throw createError({ statusCode: 500, statusMessage: 'server_error' })
  }

  const uploads: { path: string; token: string }[] = []
  for (const pending of pendingUploads) {
    const { data, error } = await supabase.storage
      .from(ATTACHMENTS_BUCKET)
      .createSignedUploadUrl(pending.path)
    if (error || !data) {
      console.error('[service-requests] signed upload URL failed', error?.message)
      // Don't leave a half-created request behind.
      await supabase.from('service_requests').delete().eq('id', requestId)
      throw createError({ statusCode: 500, statusMessage: 'server_error' })
    }
    uploads.push({ path: data.path, token: data.token })
  }

  await notifyAdmin('Monjiz: new service request', 'A new service request is waiting in the dashboard.')

  setResponseStatus(event, 201)
  return { ok: true, requestId, finalizeToken, uploads }
})

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex')
}
