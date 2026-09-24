import { z } from 'zod'
import type { RequestDetail } from '#shared/types/admin'

/** GET /api/admin/requests/:id — full request with attachments and audit trail. */
export default defineEventHandler(async (event): Promise<RequestDetail> => {
  const { db, adminId } = await requireAdmin(event)
  const id = parseOr400(z.uuid(), getRouterParam(event, 'id'))

  const { data, error } = await db
    .from('service_requests')
    .select(`${REQUEST_LIST_COLUMNS}, phone, company_name, details, updated_at, quoted_price, due_date`)
    .eq('id', id)
    .maybeSingle()
  failOn(error, 'get request')
  if (!data) throw createError({ statusCode: 404, statusMessage: 'not_found' })

  const [
    { data: attachments, error: attError },
    { data: messages, error: messagesError },
    { data: notes, error: notesError },
    { data: auditRows, error: auditError },
  ] = await Promise.all([
    db
      .from('request_attachments')
      .select('id, original_filename, mime_type, size_bytes, created_at')
      .eq('request_id', id)
      .order('created_at'),
    db
      .from('request_messages')
      .select('id, sender, body, created_at')
      .eq('request_id', id)
      .order('created_at'),
    db
      .from('request_notes')
      .select('id, body, created_at, updated_at')
      .eq('request_id', id)
      .order('created_at', { ascending: false }),
    db
      .from('audit_log')
      .select('id, action, created_at')
      .eq('target_id', id)
      .order('created_at', { ascending: false })
      .limit(50),
  ])
  failOn(attError, 'get attachments')
  failOn(messagesError, 'get messages')
  failOn(notesError, 'get notes')
  failOn(auditError, 'get audit')

  // Opening the request marks the client's messages as read.
  await db
    .from('request_messages')
    .update({ read_by_admin: true })
    .eq('request_id', id)
    .eq('sender', 'client')
    .eq('read_by_admin', false)

  // Record that this client's personal data was viewed (PDPL accountability).
  await audit(adminId, 'view_request', 'service_requests', id)

  const row = data as never as Record<string, unknown>
  return {
    ...toRequestListItem(row as never),
    phone: row.phone as string | null,
    company_name: row.company_name as string | null,
    details: row.details as string,
    updated_at: row.updated_at as string,
    // Postgres numeric arrives as a string; the UI works with numbers.
    quoted_price: row.quoted_price === null ? null : Number(row.quoted_price),
    due_date: row.due_date as string | null,
    attachments: attachments ?? [],
    messages: (messages ?? []) as RequestDetail['messages'],
    notes: notes ?? [],
    audit: auditRows ?? [],
  }
})
