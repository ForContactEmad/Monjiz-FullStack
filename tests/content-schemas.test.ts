import { describe, expect, it } from 'vitest'
import {
  categoryCreateSchema,
  clientAttachmentsFinalizeSchema,
  clientAttachmentsInitSchema,
  categoryUpdateSchema,
  portfolioSchema,
  requestNoteSchema,
  requestUpdateSchema,
  settingsSchema,
  testimonialSchema,
} from '../server/utils/validation'

describe('settingsSchema', () => {
  const valid = {
    orders_completed: 120,
    years_experience: 5,
    freelance_license_number: 'FL-123',
    contact_email: 'info@example.com',
    whatsapp: '966500000000',
  }

  it('accepts real values', () => {
    expect(settingsSchema.safeParse(valid).success).toBe(true)
  })

  it('turns cleared fields into null so the section hides on the site', () => {
    const r = settingsSchema.parse({
      orders_completed: null,
      years_experience: null,
      freelance_license_number: '  ',
      contact_email: '',
      whatsapp: '',
    })
    expect(r).toEqual({
      orders_completed: null,
      years_experience: null,
      freelance_license_number: null,
      contact_email: null,
      whatsapp: null,
    })
  })

  it('rejects a WhatsApp number with "+", spaces or letters', () => {
    for (const whatsapp of ['+966500000000', '966 500 000', 'call-me']) {
      expect(settingsSchema.safeParse({ ...valid, whatsapp }).success).toBe(false)
    }
  })

  it('rejects negative or absurd stats', () => {
    expect(settingsSchema.safeParse({ ...valid, orders_completed: -1 }).success).toBe(false)
    expect(settingsSchema.safeParse({ ...valid, years_experience: 200 }).success).toBe(false)
  })
})

describe('categoryCreateSchema', () => {
  const base = { name_ar: 'مونتاج', name_en: 'Video editing', description_ar: '', description_en: '' }

  it('accepts a URL-safe slug', () => {
    expect(categoryCreateSchema.safeParse({ ...base, slug: 'video-editing' }).success).toBe(true)
  })

  it('rejects slugs with spaces, capitals, Arabic or path characters', () => {
    for (const slug of ['Video', 'video editing', 'مونتاج', '../admin', '-start']) {
      expect(categoryCreateSchema.safeParse({ ...base, slug }).success).toBe(false)
    }
  })

  it('never lets an update change the slug', () => {
    const r = categoryUpdateSchema.parse({ ...base, slug: 'hacked' } as never)
    expect(r).not.toHaveProperty('slug')
  })
})

describe('portfolioSchema & testimonialSchema', () => {
  it('requires both Arabic and English titles', () => {
    const r = portfolioSchema.safeParse({ category_id: null, title_ar: 'عنوان', title_en: '', description_ar: '', description_en: '' })
    expect(r.success).toBe(false)
  })

  it('rejects a category_id that is not a UUID', () => {
    const r = portfolioSchema.safeParse({ category_id: "1 OR 1=1", title_ar: 'a', title_en: 'b', description_ar: '', description_en: '' })
    expect(r.success).toBe(false)
  })

  it('caps review length', () => {
    expect(testimonialSchema.safeParse({ name: 'Sara', text: 'x'.repeat(1001) }).success).toBe(false)
    expect(testimonialSchema.safeParse({ name: 'Sara', text: 'Great work' }).success).toBe(true)
  })
})

describe('requestUpdateSchema', () => {
  it('accepts a price and a date', () => {
    expect(requestUpdateSchema.safeParse({ quoted_price: 1500.5, due_date: '2026-10-01' }).success).toBe(true)
  })

  it('rejects negative prices, more than 2 decimals, and malformed dates', () => {
    expect(requestUpdateSchema.safeParse({ quoted_price: -1 }).success).toBe(false)
    expect(requestUpdateSchema.safeParse({ quoted_price: 10.123 }).success).toBe(false)
    expect(requestUpdateSchema.safeParse({ due_date: '01/10/2026' }).success).toBe(false)
  })

  it('rejects an empty update', () => {
    expect(requestUpdateSchema.safeParse({}).success).toBe(false)
  })

  it('rejects an unknown status', () => {
    expect(requestUpdateSchema.safeParse({ status: 'paid' }).success).toBe(false)
  })
})

describe('CDN image links & request notes', () => {
  const base = { category_id: null, title_ar: 'أ', title_en: 'b', description_ar: '', description_en: '' }

  it('accepts an https CDN link', () => {
    const r = portfolioSchema.safeParse({ ...base, image_url: 'https://cdn.example.com/a.jpg' })
    expect(r.success).toBe(true)
  })

  it('rejects http and javascript: links', () => {
    for (const image_url of ['http://cdn.example.com/a.jpg', 'javascript:alert(1)', 'data:image/png;base64,AAA']) {
      expect(portfolioSchema.safeParse({ ...base, image_url }).success).toBe(false)
    }
  })

  it('treats an empty link as "no link"', () => {
    expect(portfolioSchema.parse({ ...base, image_url: '' }).image_url).toBeNull()
  })

  it('requires a non-empty note within the length cap', () => {
    expect(requestNoteSchema.safeParse({ body: '   ' }).success).toBe(false)
    expect(requestNoteSchema.safeParse({ body: 'x'.repeat(5001) }).success).toBe(false)
    expect(requestNoteSchema.safeParse({ body: 'Called the client today' }).success).toBe(true)
  })

  it('validates corrected client fields like the original form does', () => {
    expect(requestUpdateSchema.safeParse({ email: 'not-an-email' }).success).toBe(false)
    expect(requestUpdateSchema.safeParse({ full_name: 'A' }).success).toBe(false)
    expect(requestUpdateSchema.safeParse({ email: 'ok@example.com', full_name: 'Sara' }).success).toBe(true)
  })
})

describe('client attachment schemas', () => {
  it('accepts up to 3 allowed files at a time', () => {
    const file = { name: 'a.png', size: 1000, type: 'image/png' }
    expect(clientAttachmentsInitSchema.safeParse({ files: [file, file, file] }).success).toBe(true)
    expect(clientAttachmentsInitSchema.safeParse({ files: [file, file, file, file] }).success).toBe(false)
    expect(clientAttachmentsInitSchema.safeParse({ files: [] }).success).toBe(false)
  })

  it('rejects a disallowed type or an oversized file up front', () => {
    expect(
      clientAttachmentsInitSchema.safeParse({ files: [{ name: 'x.exe', size: 10, type: 'application/x-msdownload' }] })
        .success
    ).toBe(false)
    expect(
      clientAttachmentsInitSchema.safeParse({ files: [{ name: 'a.png', size: 11 * 1024 * 1024, type: 'image/png' }] })
        .success
    ).toBe(false)
  })

  it('validates the finalize payload shape', () => {
    const ok = { files: [{ path: 'pending/abc/def', name: 'a.png', type: 'image/png' }] }
    expect(clientAttachmentsFinalizeSchema.safeParse(ok).success).toBe(true)
    // A path pointing elsewhere still parses here — the route itself rejects
    // anything not under pending/<request id>/, which is the real guard.
    expect(clientAttachmentsFinalizeSchema.safeParse({ files: [{ path: 'x', name: 'a', type: 'text/plain' }] }).success).toBe(false)
  })
})
