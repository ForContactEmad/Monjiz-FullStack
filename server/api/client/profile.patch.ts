/** PATCH /api/client/profile — the client edits their own details. */
export default defineEventHandler(async (event) => {
  assertSameOrigin(event)
  assertSmallBody(event, 4 * 1024)
  const { userId, db } = await requireClient(event)
  const input = parseOr400(clientProfileSchema, await readBody(event))

  // RLS also limits this to the client's own row.
  const { error } = await db.from('client_profiles').update(input).eq('id', userId)
  failOn(error, 'update client profile')
  return { ok: true }
})
