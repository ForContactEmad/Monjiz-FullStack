import { randomUUID } from 'node:crypto'
import { z } from 'zod'

/** Browser resizes before upload (see app/utils/resizeImage.ts); this is a hard stop. */
const MAX_UPLOAD_BYTES = 4 * 1024 * 1024

/**
 * POST /api/admin/portfolio/:id/image — multipart, field "image".
 *
 * Even though only the admin can call this, the image goes through the
 * same content verification as client uploads: real type from the bytes,
 * re-encoded (metadata and hidden payloads removed), decompression-bomb
 * cap. A compromised or careless upload shouldn't publish anything but a
 * clean image to a PUBLIC bucket.
 */
export default defineEventHandler(async (event) => {
  assertSameOrigin(event)
  assertSmallBody(event, MAX_UPLOAD_BYTES + 64 * 1024)
  const { db, adminId } = await requireAdmin(event)
  const id = parseOr400(z.uuid(), getRouterParam(event, 'id'))

  const parts = await readMultipartFormData(event)
  const file = parts?.find((p) => p.name === 'image')
  if (!file?.data?.length || !file.type?.startsWith('image/')) {
    throw createError({ statusCode: 400, statusMessage: 'invalid_input' })
  }

  const result = await verifyAttachment(file.data, file.type)
  if (!result.ok || !result.file.mime.startsWith('image/')) {
    throw createError({ statusCode: 400, statusMessage: 'invalid_image' })
  }

  const { data: item, error: getError } = await db
    .from('portfolio_items')
    .select('image_path')
    .eq('id', id)
    .maybeSingle()
  failOn(getError, 'portfolio lookup')
  if (!item) throw createError({ statusCode: 404, statusMessage: 'not_found' })

  const bucket = db.storage.from(PORTFOLIO_BUCKET)
  const path = `portfolio/${id}/${randomUUID()}.${result.file.extension}`
  const { error: uploadError } = await bucket.upload(path, result.file.bytes, {
    contentType: result.file.mime,
    upsert: false,
  })
  failOn(uploadError, 'upload portfolio image')

  const { error: updateError } = await db.from('portfolio_items').update({ image_path: path }).eq('id', id)
  if (updateError) {
    await bucket.remove([path])
    failOn(updateError, 'save portfolio image path')
  }
  // Replace, don't accumulate: the previous image is removed only after the
  // new one is safely saved.
  if (item.image_path) await bucket.remove([item.image_path])

  await audit(adminId, 'update_portfolio_image', 'portfolio_items', id)
  return { ok: true, imageUrl: bucket.getPublicUrl(path).data.publicUrl }
})
