import type { RequestStatus } from './admin'

/** What a signed-in client sees about themselves. */
export interface ClientProfile {
  id: string
  email: string
  full_name: string
  phone: string | null
  company_name: string | null
}

export interface RequestMessage {
  id: string
  sender: 'client' | 'admin'
  body: string
  created_at: string
}

export interface ClientRequestListItem {
  id: string
  status: RequestStatus
  created_at: string
  category: { name_ar: string; name_en: string } | null
  quoted_price: number | null
  due_date: string | null
  unread_messages: number
}

/**
 * The client's view of their own request. Deliberately does NOT include
 * request_notes — admin-only, with no policy
 * grants a client access to them (see migration 0008).
 */
export interface ClientRequestDetail extends ClientRequestListItem {
  details: string
  phone: string | null
  company_name: string | null
  attachments: { id: string; original_filename: string; size_bytes: number }[]
  messages: RequestMessage[]
}
