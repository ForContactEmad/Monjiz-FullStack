import { REQUEST_STATUSES, type DashboardStats, type RequestStatus } from '#shared/types/admin'

/** GET /api/admin/stats — numbers and recent requests for the overview. */
export default defineEventHandler(async (event): Promise<DashboardStats> => {
  const { db } = await requireAdmin(event)

  const counts = await Promise.all(
    REQUEST_STATUSES.map(async (status) => {
      const { count, error } = await db
        .from('service_requests')
        .select('id', { count: 'exact', head: true })
        .eq('status', status)
      failOn(error, 'stats count')
      return [status, count ?? 0] as const
    })
  )

  const { count: newMessages, error: msgError } = await db
    .from('contact_messages')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'new')
  failOn(msgError, 'stats messages')

  const { count: unreadClientMessages, error: replyError } = await db
    .from('request_messages')
    .select('id', { count: 'exact', head: true })
    .eq('sender', 'client')
    .eq('read_by_admin', false)
  failOn(replyError, 'stats client replies')

  const { data: recent, error: recentError } = await db
    .from('service_requests')
    .select(REQUEST_LIST_COLUMNS)
    .order('created_at', { ascending: false })
    .limit(5)
  failOn(recentError, 'stats recent')

  return {
    requestsByStatus: Object.fromEntries(counts) as Record<RequestStatus, number>,
    newMessages: newMessages ?? 0,
    unreadClientMessages: unreadClientMessages ?? 0,
    recent: (recent ?? []).map((r) => toRequestListItem(r as never)),
  }
})
