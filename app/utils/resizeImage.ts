/**
 * Shrinks an image in the browser before upload: longest side capped at
 * `maxSide`, re-encoded as WebP (JPEG where WebP encoding isn't supported).
 *
 * Why here and not only on the server: server requests on Vercel are
 * capped at 4.5 MB, and phone photos are often larger. Drawing to a canvas
 * also drops EXIF (including GPS). The server still verifies and
 * re-encodes the result — this is a size step, not a security step.
 */
export async function resizeImage(file: File, maxSide = 1600): Promise<Blob> {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height))
  const width = Math.round(bitmap.width * scale)
  const height = Math.round(bitmap.height * scale)

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('canvas unavailable')
  ctx.drawImage(bitmap, 0, 0, width, height)
  bitmap.close()

  const encode = (type: string) =>
    new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, 0.85))
  const webp = await encode('image/webp')
  // Some browsers silently return PNG when they can't encode WebP.
  if (webp && webp.type === 'image/webp') return webp
  const jpeg = await encode('image/jpeg')
  if (!jpeg) throw new Error('image encoding failed')
  return jpeg
}
