import type { AuthStage } from '#shared/types/admin'

/** GET /api/auth/session — which login step this browser is at. */
export default defineEventHandler(async (event): Promise<{ stage: AuthStage }> => {
  setResponseHeader(event, 'Cache-Control', 'no-store')
  return { stage: await getAuthStage(event) }
})
