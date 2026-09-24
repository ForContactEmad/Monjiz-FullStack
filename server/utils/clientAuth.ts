import type { H3Event } from 'h3'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { ClientProfile } from '#shared/types/client'

/*
 * Client-side accounts (people ordering services), kept strictly apart
 * from admin accounts:
 *   • A client signs in with a password only — no 2FA is required of them.
 *   • A client session grants NOTHING in the dashboard: every admin route
 *     goes through requireAdmin(), which needs admin_profiles + 2FA, and
 *     every admin RLS policy goes through is_admin(), which needs the same.
 *   • A client only ever reaches their own rows, enforced by RLS on
 *     service_requests / request_attachments / request_messages.
 * Sessions reuse the same httpOnly cookies as the admin (server/utils/auth.ts).
 */

export interface ClientContext {
  userId: string
  email: string
  profile: { full_name: string; phone: string | null; company_name: string | null }
  /** Supabase client acting as this client — RLS applies to every query. */
  db: SupabaseClient
}

/** Gate for every /api/client route. 401 when not signed in as a client. */
export async function requireClient(event: H3Event): Promise<ClientContext> {
  const session = await resolveSession(event)
  if (!session) throw createError({ statusCode: 401, statusMessage: 'unauthenticated' })

  const { data, error } = await useSupabaseAdmin()
    .from('client_profiles')
    .select('id, full_name, phone, company_name')
    .eq('id', session.user.id)
    .maybeSingle()
  if (error) {
    console.error('[clientAuth] profile lookup failed', error.message)
    throw createError({ statusCode: 500, statusMessage: 'server_error' })
  }
  // A valid Supabase session that isn't a client account (e.g. the admin's)
  // gets no client access either.
  if (!data) throw createError({ statusCode: 403, statusMessage: 'forbidden' })

  return {
    userId: session.user.id,
    email: session.user.email ?? '',
    profile: { full_name: data.full_name, phone: data.phone, company_name: data.company_name },
    db: createUserClient(session.accessToken),
  }
}

/** The signed-in client's profile, or null when not signed in as a client. */
export async function getClientProfile(event: H3Event): Promise<ClientProfile | null> {
  const session = await resolveSession(event)
  if (!session) return null

  const { data } = await useSupabaseAdmin()
    .from('client_profiles')
    .select('id, full_name, phone, company_name')
    .eq('id', session.user.id)
    .maybeSingle()
  if (!data) return null

  return {
    id: data.id,
    email: session.user.email ?? '',
    full_name: data.full_name,
    phone: data.phone,
    company_name: data.company_name,
  }
}
