import { fileTypeFromBuffer } from 'file-type'
import sharp from 'sharp'
import {
  ALLOWED_ATTACHMENT_TYPES,
  MAX_ATTACHMENT_BYTES,
  isAllowedAttachmentType,
  type AllowedAttachmentType,
} from '#shared/uploads'

export type VerifiedAttachment = {
  bytes: Buffer
  mime: AllowedAttachmentType
  extension: string
}

export type RejectionReason = 'too_large' | 'unknown_type' | 'type_not_allowed' | 'type_mismatch' | 'unreadable_image'

/**
 * Verifies an uploaded file by its actual content, never by its name or
 * the Content-Type the browser claimed.
 *
 * 1. Size re-checked against the real byte length.
 * 2. Type detected from magic bytes; must be allow-listed AND match what
 *    the browser declared (a "photo.jpg" that is really a PDF is rejected).
 * 3. Images are decoded and re-encoded. That strips EXIF/GPS/camera
 *    metadata and drops any extra payload appended to the image (the
 *    "polyglot file" trick), because only decoded pixels survive.
 *
 * PDFs and Office files are stored as-is after the type check; their
 * internal metadata is not stripped (documented in docs/SECURITY.md).
 */
export async function verifyAttachment(
  input: Buffer,
  declaredMime: string
): Promise<{ ok: true; file: VerifiedAttachment } | { ok: false; reason: RejectionReason }> {
  if (input.byteLength === 0 || input.byteLength > MAX_ATTACHMENT_BYTES) {
    return { ok: false, reason: 'too_large' }
  }

  const detected = await fileTypeFromBuffer(input)
  if (!detected) return { ok: false, reason: 'unknown_type' }
  if (!isAllowedAttachmentType(detected.mime)) return { ok: false, reason: 'type_not_allowed' }
  if (detected.mime !== declaredMime) return { ok: false, reason: 'type_mismatch' }

  const mime = detected.mime
  const extension = ALLOWED_ATTACHMENT_TYPES[mime]

  if (mime.startsWith('image/')) {
    try {
      const bytes = await reencodeImage(input, mime)
      // Re-encoding can make a file bigger (PNG especially); the stored
      // file must still respect the cap enforced by the DB constraint.
      if (bytes.byteLength > MAX_ATTACHMENT_BYTES) return { ok: false, reason: 'too_large' }
      return { ok: true, file: { bytes, mime, extension } }
    } catch {
      return { ok: false, reason: 'unreadable_image' }
    }
  }

  return { ok: true, file: { bytes: input, mime, extension } }
}

async function reencodeImage(input: Buffer, mime: AllowedAttachmentType): Promise<Buffer> {
  // limitInputPixels guards against decompression bombs (a tiny file that
  // expands to gigabytes of pixels). 40 MP covers any real phone photo.
  // .rotate() applies the EXIF orientation before the metadata is dropped,
  // so portrait photos don't come out sideways.
  const image = sharp(input, { limitInputPixels: 40_000_000 }).rotate()

  // sharp writes no metadata unless .withMetadata() is called — so the
  // output is clean by default.
  switch (mime) {
    case 'image/jpeg':
      return image.jpeg({ quality: 90 }).toBuffer()
    case 'image/png':
      return image.png().toBuffer()
    case 'image/webp':
      return image.webp({ quality: 90 }).toBuffer()
    default:
      throw new Error('not an image type')
  }
}

/**
 * Keeps an original filename displayable but harmless: strips any path,
 * control characters and bidi-override characters (which can visually
 * disguise an extension, e.g. "invoice\u202Efdp.exe"), caps the length.
 * Only ever used for display — storage paths are generated server-side.
 */
export function sanitizeDisplayName(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? 'file'
  const cleaned = base
    // eslint-disable-next-line no-control-regex -- removing control characters is the point here
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .replace(/[\u202a-\u202e\u2066-\u2069]/g, '')
    .trim()
  return (cleaned || 'file').slice(0, 150)
}
