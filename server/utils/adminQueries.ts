import type { SupabaseClient } from '@supabase/supabase-js'
import type { PortfolioItem, RequestListItem } from '#shared/types/admin'
import type { ClientRequestListItem } from '#shared/types/client'

/** Columns for a request row in lists. Never includes upload internals. */
export const REQUEST_LIST_COLUMNS =
  'id, full_name, email, status, created_at, category:service_categories(slug, name_ar, name_en), request_attachments(count)'

type RawRequestRow = Omit<RequestListItem, 'attachment_count' | 'category'> & {
  category: RequestListItem['category'] | RequestListItem['category'][]
  request_attachments: { count: number }[]
}

/** Flattens PostgREST's nested shapes into the flat list item the UI uses. */
export function toRequestListItem(row: RawRequestRow): RequestListItem {
  const { request_attachments, category, ...rest } = row
  return {
    ...rest,
    category: Array.isArray(category) ? (category[0] ?? null) : category,
    attachment_count: request_attachments?.[0]?.count ?? 0,
  }
}

export async function categoryIdBySlug(db: SupabaseClient, slug: string): Promise<string | null> {
  const { data } = await db.from('service_categories').select('id').eq('slug', slug).maybeSingle()
  return data?.id ?? null
}

/** Throws a generic 500 for a Supabase error, logging the real cause. */
export function failOn(error: { message: string } | null, where: string): void {
  if (!error) return
  console.error(`[admin] ${where}:`, error.message)
  throw createError({ statusCode: 500, statusMessage: 'server_error' })
}

export const PORTFOLIO_BUCKET = 'portfolio-public'
export const PORTFOLIO_COLUMNS =
  'id, category_id, title_ar, title_en, description_ar, description_en, image_path, image_url, sort_order, is_published, category:service_categories(name_ar, name_en)'

type PortfolioRow = Omit<PortfolioItem, 'image_url' | 'external_image_url' | 'has_upload' | 'category'> & {
  image_path: string | null
  image_url: string | null
  category: PortfolioItem['category'] | PortfolioItem['category'][]
}

/**
 * Resolves the image to show and flattens the category join.
 * An uploaded file wins over an external link: it is the copy we control,
 * already verified and stripped of metadata.
 */
export function toPortfolioItem(db: SupabaseClient, row: PortfolioRow): PortfolioItem {
  const { image_path, image_url, category, ...rest } = row
  const uploaded = image_path ? db.storage.from(PORTFOLIO_BUCKET).getPublicUrl(image_path).data.publicUrl : null
  return {
    ...rest,
    category: Array.isArray(category) ? (category[0] ?? null) : category,
    image_url: uploaded ?? image_url,
    external_image_url: image_url,
    has_upload: Boolean(image_path),
  }
}

type ClientRequestRow = {
  id: string
  status: ClientRequestListItem['status']
  created_at: string
  quoted_price: string | number | null
  due_date: string | null
  category: ClientRequestListItem['category'] | ClientRequestListItem['category'][]
  request_messages?: { count: number }[]
}

/** Flattens a client-facing request row; numeric price arrives as a string. */
export function toClientListItem(row: ClientRequestRow): ClientRequestListItem {
  const { category, request_messages, quoted_price, ...rest } = row
  return {
    ...rest,
    category: Array.isArray(category) ? (category[0] ?? null) : category,
    quoted_price: quoted_price === null ? null : Number(quoted_price),
    unread_messages: request_messages?.[0]?.count ?? 0,
  }
}
