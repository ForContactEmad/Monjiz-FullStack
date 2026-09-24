import { z } from 'zod'
import type { ClientRequestDetail } from '#shared/types/client'

/**
 * GET /api/client/requests/:id — one of the client's own requests.
 * RLS returns nothing for anyone else's request, so a guessed id yields 404.
 * Internal notes are not selected here at all.
 */
export default defineEventHandler(async (event): Promise<ClientRequestDetail> => {
  const { db } = await requireClient(event)
  const id = parseOr400(z.uuid(), getRouterParam(event, 'id'))

  const { data, error } = await db
    .from('service_requests')
    .select(
      'id, status, created_at, quoted_price, due_date, details, phone, company_name, category:service_categories(name_ar, name_en)'
    )
    .eq('id', id)
    .maybeSingle()
  failOn(error, 'client request')
  if (!data) throw createError({ statusCode: 404, statusMessage: 'not_found' })

  const [{ data: attachments }, { data: messages }] = await Promise.all([
    db.from('request_attachments').select('id, original_filename, size_bytes').eq('request_id', id).order('created_at'),
    db.from('request_messages').select('id, sender, body, created_at').eq('request_id', id).order('created_at'),
  ])

  // Opening the request marks the admin's messages as read for this client.
  await db
    .from('request_messages')
    .update({ read_by_client: true })
    .eq('request_id', id)
    .eq('sender', 'admin')
    .eq('read_by_client', false)

  const row = data as never as Record<string, unknown>
  return {
    ...toClientListItem(row as never),
    details: row.details as string,
    phone: row.phone as string | null,
    company_name: row.company_name as string | null,
    attachments: attachments ?? [],
    messages: (messages ?? []) as ClientRequestDetail['messages'],
    unread_messages: 0,
  }
})
