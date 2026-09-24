import type { ClientProfile } from '#shared/types/client'

/** GET /api/client/session — the signed-in client's profile, or null. */
export default defineEventHandler(async (event): Promise<{ profile: ClientProfile | null }> => {
  setResponseHeader(event, 'Cache-Control', 'no-store')
  return { profile: await getClientProfile(event) }
})
