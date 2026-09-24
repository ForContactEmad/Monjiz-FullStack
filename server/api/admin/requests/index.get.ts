import type { Paginated, RequestListItem } from '#shared/types/admin'

/** GET /api/admin/requests?page&status&category&q — paginated, filterable list. */
export default defineEventHandler(async (event): Promise<Paginated<RequestListItem>> => {
  const { db } = await requireAdmin(event)
  const query = parseOr400(requestListQuerySchema, getQuery(event))

  const from = (query.page - 1) * ADMIN_PAGE_SIZE
  let request = db
    .from('service_requests')
    .select(REQUEST_LIST_COLUMNS, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, from + ADMIN_PAGE_SIZE - 1)

  if (query.status) request = request.eq('status', query.status)
  if (query.category) {
    const categoryId = await categoryIdBySlug(db, query.category)
    if (!categoryId) return { items: [], total: 0, page: query.page, pageSize: ADMIN_PAGE_SIZE }
    request = request.eq('category_id', categoryId)
  }
  const search = sanitizeSearch(query.q)
  if (search) request = request.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`)

  const { data, count, error } = await request
  failOn(error, 'list requests')

  return {
    items: (data ?? []).map((r) => toRequestListItem(r as never)),
    total: count ?? 0,
    page: query.page,
    pageSize: ADMIN_PAGE_SIZE,
  }
})
