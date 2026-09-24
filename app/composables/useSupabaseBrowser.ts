import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let client: SupabaseClient | null = null

/**
 * Browser Supabase client with the public anon key.
 *
 * Used for exactly one thing: uploading attachments to a signed upload
 * URL issued by our server. The anon key is public by design — RLS gives
 * it no write access to any table or bucket, and a signed upload URL is
 * valid for a single, server-chosen path only.
 */
export function useSupabaseBrowser(): SupabaseClient {
  if (client) return client
  const { supabaseUrl, supabaseAnonKey } = useRuntimeConfig().public
  client = createClient(supabaseUrl as string, supabaseAnonKey as string, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  return client
}
