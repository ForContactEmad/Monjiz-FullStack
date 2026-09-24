import { createClient, type Session, type SupabaseClient, type User } from '@supabase/supabase-js'
import type { H3Event } from 'h3'
import type { AuthStage } from '#shared/types/admin'

/*
 * Admin authentication & authorization.
 *
 * Tokens never reach JavaScript: the server performs every Supabase Auth
 * call and hands the browser only httpOnly cookies, so an XSS bug can't
 * steal a session. Every admin request then passes three independent
 * checks (docs/SECURITY.md §6):
 *   1. a valid Supabase session (verified with the Auth server),
 *   2. that session reached AAL2 — i.e. the 2FA code was entered,
 *   3. the user has a row in admin_profiles.
 * Queries run with the admin's own token, so Row Level Security enforces
 * the same rules again inside the database (is_admin() also requires aal2,
 * see migration 0005).
 */

const ACCESS_COOKIE = 'monjiz_at'
const REFRESH_COOKIE = 'monjiz_rt'
/** Forces a full re-login (password + 2FA) at least weekly. */
const SESSION_MAX_AGE_SECONDS = 7 * 24 * 60 * 60

function cookieOptions() {
  return {
    httpOnly: true,
    secure: !import.meta.dev, // localhost dev runs on plain http
    sameSite: 'strict' as const,
    path: '/',
    maxAge: SESSION_MAX_AGE_SECONDS,
  }
}

export function setSessionCookies(event: H3Event, session: Pick<Session, 'access_token' | 'refresh_token'>) {
  setCookie(event, ACCESS_COOKIE, session.access_token, cookieOptions())
  setCookie(event, REFRESH_COOKIE, session.refresh_token, cookieOptions())
}

export function clearSessionCookies(event: H3Event) {
  deleteCookie(event, ACCESS_COOKIE, { path: '/' })
  deleteCookie(event, REFRESH_COOKIE, { path: '/' })
}

/** Fresh Supabase client with the public anon key, no persisted state. */
export function createAuthClient(): SupabaseClient {
  const { supabaseUrl, supabaseAnonKey } = useRuntimeConfig().public
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('[auth] NUXT_PUBLIC_SUPABASE_URL or NUXT_PUBLIC_SUPABASE_ANON_KEY is not set')
    throw createError({ statusCode: 500, statusMessage: 'server_misconfigured' })
  }
  return createClient(supabaseUrl as string, supabaseAnonKey as string, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

/**
 * Client that acts AS the signed-in admin: Row Level Security applies to
 * every query it makes. Admin data is read through this, never through
 * the service_role client.
 */
export function createUserClient(accessToken: string): SupabaseClient {
  const { supabaseUrl, supabaseAnonKey } = useRuntimeConfig().public
  return createClient(supabaseUrl as string, supabaseAnonKey as string, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

/**
 * Reads the payload of a JWT WITHOUT verifying it. Only call this on a
 * token that Supabase has already accepted (after auth.getUser succeeded).
 */
export function readJwtClaims(token: string): Record<string, unknown> {
  const payload = token.split('.')[1]
  if (!payload) return {}
  try {
    return JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))
  } catch {
    return {}
  }
}

interface ResolvedSession {
  user: User
  accessToken: string
  refreshToken: string
  aal: 'aal1' | 'aal2'
}

/**
 * The current session from cookies, validated with Supabase Auth.
 * Transparently refreshes an expired access token and rewrites the
 * cookies. Returns null when there is no usable session.
 */
export async function resolveSession(event: H3Event): Promise<ResolvedSession | null> {
  const accessToken = getCookie(event, ACCESS_COOKIE)
  const refreshToken = getCookie(event, REFRESH_COOKIE)
  if (!accessToken || !refreshToken) return null

  const auth = createAuthClient().auth
  const { data, error } = await auth.getUser(accessToken)
  if (!error && data.user) {
    return { user: data.user, accessToken, refreshToken, aal: aalOf(accessToken) }
  }

  // Access token expired or revoked: try the refresh token once.
  const refreshed = await auth.refreshSession({ refresh_token: refreshToken })
  if (refreshed.error || !refreshed.data.session || !refreshed.data.user) {
    clearSessionCookies(event)
    return null
  }
  setSessionCookies(event, refreshed.data.session)
  const token = refreshed.data.session.access_token
  return {
    user: refreshed.data.user,
    accessToken: token,
    refreshToken: refreshed.data.session.refresh_token,
    aal: aalOf(token),
  }
}

function aalOf(token: string): 'aal1' | 'aal2' {
  return readJwtClaims(token).aal === 'aal2' ? 'aal2' : 'aal1'
}

/** A client whose session is the admin's, needed for MFA calls. */
export async function createSessionClient(session: ResolvedSession): Promise<SupabaseClient> {
  const client = createAuthClient()
  const { error } = await client.auth.setSession({
    access_token: session.accessToken,
    refresh_token: session.refreshToken,
  })
  if (error) throw createError({ statusCode: 401, statusMessage: 'unauthenticated' })
  return client
}

export async function isAdminUser(userId: string): Promise<boolean> {
  const { data, error } = await useSupabaseAdmin()
    .from('admin_profiles')
    .select('id')
    .eq('id', userId)
    .maybeSingle()
  if (error) {
    console.error('[auth] admin lookup failed', error.message)
    throw createError({ statusCode: 500, statusMessage: 'server_error' })
  }
  return Boolean(data)
}

/**
 * Where this browser is in the login flow. Non-admins are signed out on
 * the spot: a valid Supabase account alone grants nothing here.
 */
export async function getAuthStage(event: H3Event): Promise<AuthStage> {
  const session = await resolveSession(event)
  if (!session) return 'signed_out'

  if (!(await isAdminUser(session.user.id))) {
    clearSessionCookies(event)
    return 'signed_out'
  }
  if (session.aal === 'aal2') return 'ok'

  const hasVerifiedFactor = (session.user.factors ?? []).some(
    (f) => f.factor_type === 'totp' && f.status === 'verified'
  )
  return hasVerifiedFactor ? 'mfa_verify' : 'mfa_enroll'
}

export interface AdminContext {
  adminId: string
  /** Supabase client acting as the admin — RLS applies. */
  db: SupabaseClient
}

/**
 * Gate for every /api/admin route. 401 unless fully signed in with 2FA
 * and listed in admin_profiles.
 */
export async function requireAdmin(event: H3Event): Promise<AdminContext> {
  const session = await resolveSession(event)
  if (!session) throw createError({ statusCode: 401, statusMessage: 'unauthenticated' })
  if (session.aal !== 'aal2') throw createError({ statusCode: 401, statusMessage: 'mfa_required' })
  if (!(await isAdminUser(session.user.id))) {
    clearSessionCookies(event)
    throw createError({ statusCode: 403, statusMessage: 'forbidden' })
  }
  return { adminId: session.user.id, db: createUserClient(session.accessToken) }
}

/**
 * CSRF defence for state-changing requests. Cookies are already
 * SameSite=Strict; this additionally requires the Origin header to match
 * our own host, so a request forged from another site is refused even in
 * browsers with weaker SameSite handling.
 */
export function assertSameOrigin(event: H3Event) {
  if (event.method === 'GET' || event.method === 'HEAD') return
  const originHost = hostOf(getRequestHeader(event, 'origin'))
  const host = getRequestHost(event, { xForwardedHost: true })
  if (!originHost || originHost !== host) {
    throw createError({ statusCode: 403, statusMessage: 'bad_origin' })
  }
}

function hostOf(url: string | undefined): string | null {
  if (!url) return null
  try {
    return new URL(url).host
  } catch {
    return null
  }
}

/**
 * Appends to audit_log. Uses the service_role client because audit_log
 * deliberately has no insert policy (append-only, not writable via the
 * admin's own token). Never throws: auditing must not break the action,
 * but a failure is logged loudly.
 */
export async function audit(adminId: string, action: string, targetTable: string, targetId: string | null) {
  const { error } = await useSupabaseAdmin()
    .from('audit_log')
    .insert({ admin_id: adminId, action, target_table: targetTable, target_id: targetId })
  if (error) console.error('[audit] write failed', action, error.message)
}
