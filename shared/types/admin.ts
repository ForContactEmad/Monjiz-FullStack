/**
 * Shapes exchanged between the admin API (server/api/admin) and the
 * dashboard pages. Kept in shared/ so both sides import the same types.
 */

export const REQUEST_STATUSES = ['new', 'reviewing', 'quoted', 'in_progress', 'delivered', 'cancelled'] as const
export type RequestStatus = (typeof REQUEST_STATUSES)[number]

export const MESSAGE_STATUSES = ['new', 'read', 'replied'] as const
export type MessageStatus = (typeof MESSAGE_STATUSES)[number]

export interface CategoryRef {
  slug: string
  name_ar: string
  name_en: string
}

export interface RequestListItem {
  id: string
  full_name: string
  email: string
  status: RequestStatus
  created_at: string
  category: CategoryRef | null
  attachment_count: number
}

export interface AttachmentItem {
  id: string
  original_filename: string
  mime_type: string
  size_bytes: number
  created_at: string
}

export interface RequestNote {
  id: string
  body: string
  created_at: string
  updated_at: string
}

export interface AuditEntry {
  id: string
  action: string
  created_at: string
}

export interface RequestDetail extends RequestListItem, RequestManagement {
  phone: string | null
  company_name: string | null
  details: string
  updated_at: string
  attachments: AttachmentItem[]
  messages: import('./client').RequestMessage[]
  notes: RequestNote[]
  audit: AuditEntry[]
}

export interface MessageItem {
  id: string
  full_name: string
  email: string
  message: string
  status: MessageStatus
  created_at: string
}

export interface Paginated<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
}

export interface DashboardStats {
  requestsByStatus: Record<RequestStatus, number>
  newMessages: number
  /** Unread replies from clients inside requests. */
  unreadClientMessages: number
  recent: RequestListItem[]
}

/** Where the signed-in admin is in the login flow. */
export type AuthStage = 'signed_out' | 'mfa_enroll' | 'mfa_verify' | 'ok'

// ---------------------------------------------------------------------------
// Editable content (migration 0006)
// ---------------------------------------------------------------------------

/** Public site settings. null = the related section is hidden on the site. */
export interface SiteSettings {
  orders_completed: number | null
  years_experience: number | null
  freelance_license_number: string | null
  contact_email: string | null
  whatsapp: string | null
}

export interface Testimonial {
  id: string
  name: string
  text: string
  sort_order: number
  is_published: boolean
}

export interface Category {
  id: string
  slug: string
  name_ar: string
  name_en: string
  description_ar: string | null
  description_en: string | null
  sort_order: number
  is_active: boolean
}

export interface PortfolioItem {
  id: string
  category_id: string | null
  title_ar: string
  title_en: string
  description_ar: string | null
  description_en: string | null
  /** Resolved for display: the uploaded file if there is one, else the CDN link. */
  image_url: string | null
  /** The raw external link as stored, for editing. */
  external_image_url: string | null
  /** True when an uploaded file exists (it takes precedence over the link). */
  has_upload: boolean
  sort_order: number
  is_published: boolean
  /** Joined for display; null if the category is hidden or unset. */
  category: { name_ar: string; name_en: string } | null
}

/** What the public pages get in one request. */
export interface PublicSiteData {
  settings: SiteSettings
  testimonials: Pick<Testimonial, 'id' | 'name' | 'text'>[]
  categories: Pick<Category, 'slug' | 'name_ar' | 'name_en' | 'description_ar' | 'description_en'>[]
}

export interface RequestManagement {
  quoted_price: number | null
  due_date: string | null
}
