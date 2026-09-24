import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let client: SupabaseClient | null = null

/**
 * Supabase client authenticated with the service_role key.
 *
 * SERVER ONLY. This key bypasses Row Level Security, which is exactly why
 * it must never reach the browser (see docs/SECURITY.md §3). It is read
 * from runtimeConfig (not runtimeConfig.public), so Nuxt never bundles it
 * into client code.
 */
export function useSupabaseAdmin(): SupabaseClient {
  if (client) return client

  const config = useRuntimeConfig()
  const url = config.public.supabaseUrl
  const key = config.supabaseServiceRoleKey

  if (!url || !key) {
    // Log the real reason server-side; the client only sees a generic 500.
    console.error('[supabase] NUXT_PUBLIC_SUPABASE_URL or NUXT_SUPABASE_SERVICE_ROLE_KEY is not set')
    throw createError({ statusCode: 500, statusMessage: 'server_misconfigured' })
  }

  client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  return client
}
