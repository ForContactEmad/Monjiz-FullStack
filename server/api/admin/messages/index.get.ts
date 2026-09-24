import type { MessageItem, Paginated } from '#shared/types/admin'

/** GET /api/admin/messages?page&status */
export default defineEventHandler(async (event): Promise<Paginated<MessageItem>> => {
  const { db } = await requireAdmin(event)
  const query = parseOr400(messageListQuerySchema, getQuery(event))
  const from = (query.page - 1) * ADMIN_PAGE_SIZE

  let request = db
    .from('contact_messages')
    .select('id, full_name, email, message, status, created_at', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, from + ADMIN_PAGE_SIZE - 1)
  if (query.status) request = request.eq('status', query.status)

  const { data, count, error } = await request
  failOn(error, 'list messages')
  return { items: (data ?? []) as MessageItem[], total: count ?? 0, page: query.page, pageSize: ADMIN_PAGE_SIZE }
})
