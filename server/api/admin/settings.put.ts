/** PUT /api/admin/settings — replaces all public settings at once. */
export default defineEventHandler(async (event) => {
  assertSameOrigin(event)
  const { db, adminId } = await requireAdmin(event)
  const settings = parseOr400(settingsSchema, await readBody(event))

  const { error } = await db
    .from('site_settings')
    .update({ ...settings, updated_at: new Date().toISOString() })
    .eq('id', 1)
  failOn(error, 'update settings')

  await audit(adminId, 'update_settings', 'site_settings', null)
  return { ok: true }
})
