import { z } from 'zod'

/**
 * PATCH /api/admin/requests/:id
 * Body: any of { status, quoted_price, due_date } plus the client's own
 * fields (name, email, phone, company, details) for corrections.
 * A status change and a details change are audited separately so the
 * activity log reads clearly.
 */
export default defineEventHandler(async (event) => {
  assertSameOrigin(event)
  const { db, adminId } = await requireAdmin(event)
  const id = parseOr400(z.uuid(), getRouterParam(event, 'id'))
  const changes = parseOr400(requestUpdateSchema, await readBody(event))

  const { data, error } = await db.from('service_requests').update(changes).eq('id', id).select('id')
  failOn(error, 'update request')
  if (!data?.length) throw createError({ statusCode: 404, statusMessage: 'not_found' })

  if (changes.status) await audit(adminId, `set_status:${changes.status}`, 'service_requests', id)

  // Two kinds of change, logged apart: correcting what the CLIENT wrote is
  // more sensitive than setting our own price or due date.
  const clientFields = ['full_name', 'email', 'phone', 'company_name', 'details'] as const
  const { status: _status, ...rest } = changes
  if (clientFields.some((f) => f in rest)) await audit(adminId, 'edit_client_fields', 'service_requests', id)
  if (Object.keys(rest).some((k) => !clientFields.includes(k as never))) {
    await audit(adminId, 'update_details', 'service_requests', id)
  }
  return { ok: true }
})
