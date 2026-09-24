import type { ClientRequestListItem } from '#shared/types/client'

/** GET /api/client/requests — the client's own requests, newest first. */
export default defineEventHandler(async (event): Promise<ClientRequestListItem[]> => {
  const { db } = await requireClient(event)

  const { data, error } = await db
    .from('service_requests')
    .select('id, status, created_at, quoted_price, due_date, category:service_categories(name_ar, name_en)')
    .order('created_at', { ascending: false })
  failOn(error, 'client requests')

  // Unread = messages FROM the admin the client hasn't opened yet. Counted
  // in one extra query and matched up here, rather than a nested count
  // that would count every message in the thread.
  const { data: unread } = await db
    .from('request_messages')
    .select('request_id')
    .eq('sender', 'admin')
    .eq('read_by_client', false)
  const unreadByRequest = new Map<string, number>()
  for (const row of unread ?? []) {
    unreadByRequest.set(row.request_id, (unreadByRequest.get(row.request_id) ?? 0) + 1)
  }

  return (data ?? []).map((row) => {
    const item = toClientListItem(row as never)
    return { ...item, unread_messages: unreadByRequest.get(item.id) ?? 0 }
  })
})
