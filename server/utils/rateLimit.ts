import { createHash } from 'node:crypto'
import type { H3Event } from 'h3'

/**
 * Database-backed rate limit: at most `max` actions per IP per window.
 * Throws 429 `rate_limited` when exceeded.
 *
 * Stored in Postgres (rate_limit_events), not memory: Vercel runs many
 * short-lived instances, so an in-memory counter would reset constantly
 * and stop nothing. Only a salted hash of the IP is stored.
 */
export async function enforceRateLimit(
  event: H3Event,
  action: string,
  { max, windowMinutes }: { max: number; windowMinutes: number }
) {
  const supabase = useSupabaseAdmin()
  const ipHash = hashIp(event)
  const since = new Date(Date.now() - windowMinutes * 60_000).toISOString()

  const { count, error } = await supabase
    .from('rate_limit_events')
    .select('id', { count: 'exact', head: true })
    .eq('action', action)
    .eq('ip_hash', ipHash)
    .gte('created_at', since)

  if (error) {
    console.error('[rateLimit] count failed', error.message)
    throw createError({ statusCode: 500, statusMessage: 'server_error' })
  }
  if ((count ?? 0) >= max) {
    throw createError({ statusCode: 429, statusMessage: 'rate_limited' })
  }

  await supabase.from('rate_limit_events').insert({ ip_hash: ipHash, action })

  // Opportunistic cleanup; the log only needs the last day. Failure here
  // is harmless and must not block the user's request.
  const dayAgo = new Date(Date.now() - 24 * 60 * 60_000).toISOString()
  await supabase.from('rate_limit_events').delete().lt('created_at', dayAgo)
}

function hashIp(event: H3Event): string {
  const ip = getRequestIP(event, { xForwardedFor: true }) ?? 'unknown'
  const salt = useRuntimeConfig().rateLimitSalt
  if (!salt) {
    console.error('[rateLimit] RATE_LIMIT_SALT is not set')
    throw createError({ statusCode: 500, statusMessage: 'server_misconfigured' })
  }
  return createHash('sha256').update(salt + ip).digest('hex')
}
