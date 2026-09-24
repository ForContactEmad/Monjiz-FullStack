import { describe, expect, it } from 'vitest'
import sharp from 'sharp'
import JSZip from 'jszip'
import { sanitizeDisplayName, verifyAttachment } from '../server/utils/attachments'
import { MAX_ATTACHMENT_BYTES } from '../shared/uploads'

/*
 * Attack-style tests for attachment verification. Each case is a real
 * malicious or malformed file, not a mock. If any of these start failing,
 * an upload safeguard has regressed — do not deploy.
 */

const redPixels = (width = 64, height = 64) =>
  sharp({ create: { width, height, channels: 3, background: { r: 200, g: 30, b: 30 } } })

async function jpegWithGps(): Promise<Buffer> {
  return redPixels()
    .withExif({
      IFD0: { Make: 'SecretPhone', Model: 'X1', Copyright: 'owner-name' },
      IFD3: { GPSLatitudeRef: 'N', GPSLatitude: '24/1 28/1 0/1', GPSLongitudeRef: 'E', GPSLongitude: '39/1 36/1 0/1' },
    })
    .jpeg()
    .toBuffer()
}

async function minimalDocx(): Promise<Buffer> {
  const zip = new JSZip()
  zip.file(
    '[Content_Types].xml',
    '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>'
  )
  zip.file('word/document.xml', '<?xml version="1.0"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body/></w:document>')
  return zip.generateAsync({ type: 'nodebuffer' })
}

const minimalPdf = Buffer.from('%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n')

describe('verifyAttachment — accepts legitimate files', () => {
  it('accepts a real PNG and keeps it a PNG', async () => {
    const r = await verifyAttachment(await redPixels().png().toBuffer(), 'image/png')
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.file.extension).toBe('png')
  })

  it('accepts a real PDF', async () => {
    const r = await verifyAttachment(minimalPdf, 'application/pdf')
    expect(r.ok).toBe(true)
  })

  it('accepts a real DOCX', async () => {
    const r = await verifyAttachment(
      await minimalDocx(),
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    )
    expect(r.ok).toBe(true)
  })
})

describe('verifyAttachment — privacy: strips image metadata', () => {
  it('removes EXIF including GPS location and device info from a JPEG', async () => {
    const input = await jpegWithGps()
    // Sanity check: the attack file really does carry EXIF.
    expect((await sharp(input).metadata()).exif).toBeDefined()

    const r = await verifyAttachment(input, 'image/jpeg')
    expect(r.ok).toBe(true)
    if (!r.ok) return
    const meta = await sharp(r.file.bytes).metadata()
    expect(meta.exif).toBeUndefined()
    expect(r.file.bytes.includes(Buffer.from('SecretPhone'))).toBe(false)
  })
})

describe('verifyAttachment — rejects disguised and dangerous files', () => {
  it('rejects a PDF pretending to be a PNG (type mismatch)', async () => {
    const r = await verifyAttachment(minimalPdf, 'image/png')
    expect(r).toEqual({ ok: false, reason: 'type_mismatch' })
  })

  it('rejects a Windows executable even if declared as PDF', async () => {
    const exe = Buffer.alloc(512)
    exe.write('MZ', 0)
    exe.writeUInt32LE(0x80, 0x3c) // PE header offset
    exe.write('PE\0\0', 0x80, 'binary')
    const r = await verifyAttachment(exe, 'application/pdf')
    expect(r.ok).toBe(false)
  })

  it('rejects random bytes with no recognizable type', async () => {
    const r = await verifyAttachment(Buffer.from('just some text, definitely not a pdf'), 'application/pdf')
    expect(r).toEqual({ ok: false, reason: 'unknown_type' })
  })

  it('drops a script payload appended to a valid image (polyglot file)', async () => {
    const payload = Buffer.from("<?php system($_GET['cmd']); ?>")
    const polyglot = Buffer.concat([await redPixels().png().toBuffer(), payload])
    const r = await verifyAttachment(polyglot, 'image/png')
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.file.bytes.includes(payload)).toBe(false)
  })

  it('rejects a file over the size cap', async () => {
    const big = Buffer.concat([minimalPdf, Buffer.alloc(MAX_ATTACHMENT_BYTES)])
    const r = await verifyAttachment(big, 'application/pdf')
    expect(r).toEqual({ ok: false, reason: 'too_large' })
  })

  it('rejects a decompression bomb (tiny file, huge pixel count)', async () => {
    const bomb = await redPixels(7000, 7000).png({ compressionLevel: 9 }).toBuffer()
    expect(bomb.byteLength).toBeLessThan(MAX_ATTACHMENT_BYTES) // small on disk…
    const r = await verifyAttachment(bomb, 'image/png') // …49 MP when decoded
    expect(r).toEqual({ ok: false, reason: 'unreadable_image' })
  })

  it('rejects an empty file', async () => {
    const r = await verifyAttachment(Buffer.alloc(0), 'image/png')
    expect(r).toEqual({ ok: false, reason: 'too_large' })
  })
})

describe('sanitizeDisplayName', () => {
  it('strips directory paths', () => {
    expect(sanitizeDisplayName('../../etc/passwd')).toBe('passwd')
    expect(sanitizeDisplayName('C:\\Users\\x\\report.pdf')).toBe('report.pdf')
  })

  it('removes right-to-left override used to disguise extensions', () => {
    // Displays as "invoiceexe.pdf" but is really "invoice‮fdp.exe"
    expect(sanitizeDisplayName('invoice\u202efdp.exe')).toBe('invoicefdp.exe')
  })

  it('removes control characters and caps length', () => {
    expect(sanitizeDisplayName('a\u0000b\nc.pdf')).toBe('abc.pdf')
    expect(sanitizeDisplayName('x'.repeat(500)).length).toBe(150)
  })

  it('never returns an empty name', () => {
    expect(sanitizeDisplayName('\u202e')).toBe('file')
  })
})
