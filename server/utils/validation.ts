import { z } from 'zod'
import { MAX_ATTACHMENTS, MAX_ATTACHMENT_BYTES, isAllowedAttachmentType } from '#shared/uploads'
import { MESSAGE_STATUSES, REQUEST_STATUSES } from '#shared/types/admin'

/*
 * Input schemas for the public forms. Every public endpoint parses its
 * body through one of these before touching the database; anything
 * unexpected is a 400.
 *
 * `website` is a honeypot: the field is hidden from people, so only bots
 * fill it. Routes check it and quietly pretend to succeed.
 */

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => (v === '' ? null : v))
    .nullable()
    .optional()
    .transform((v) => v ?? null)

const common = {
  fullName: z.string().trim().min(2).max(100),
  email: z.email().max(254),
  consentPrivacy: z.literal(true),
  website: z.string().max(200).optional().default(''),
}

/**
 * The request form. fullName/email are NOT here: they come from the
 * signed-in client's account (server/api/service-requests.post.ts).
 */
/**
 * A request may be sent WITH or WITHOUT an account (accounts are optional).
 * Signed in: name and email come from the account and are ignored here.
 * Guest: both are required — checked in the route, which knows which case
 * it is in.
 */
export const serviceRequestSchema = z.object({
  consentPrivacy: common.consentPrivacy,
  website: common.website,
  fullName: z.string().trim().min(2).max(100).optional(),
  email: z.union([z.email().max(254), z.literal('')]).optional(),
  categorySlug: z.string().trim().min(1).max(50),
  details: z.string().trim().min(10).max(5000),
  phone: optionalText(20).refine((v) => v === null || /^\+?[0-9\s-]{7,20}$/.test(v), {
    message: 'invalid_phone',
  }),
  companyName: optionalText(150),
  files: z
    .array(
      z.object({
        name: z.string().min(1).max(255),
        size: z.number().int().positive().max(MAX_ATTACHMENT_BYTES),
        type: z.string().refine(isAllowedAttachmentType, { message: 'type_not_allowed' }),
      })
    )
    .max(MAX_ATTACHMENTS)
    .default([]),
})

export const contactMessageSchema = z.object({
  ...common,
  message: z.string().trim().min(10).max(5000),
})

export const finalizeSchema = z.object({
  token: z.string().regex(/^[a-f0-9]{64}$/),
})

/** Parses or throws a 400 with a stable, non-leaky error code. */
export function parseOr400<T extends z.ZodType>(schema: T, input: unknown): z.output<T> {
  const result = schema.safeParse(input)
  if (!result.success) {
    throw createError({ statusCode: 400, statusMessage: 'invalid_input' })
  }
  return result.data
}

/**
 * Rejects oversized bodies before they are read into memory. These
 * endpoints only ever receive a few KB of JSON — files never come
 * through the server (see docs/SECURITY.md).
 */
export function assertSmallBody(event: Parameters<typeof getRequestHeader>[0], maxBytes = 64 * 1024) {
  const length = Number(getRequestHeader(event, 'content-length') ?? 0)
  if (length > maxBytes) {
    throw createError({ statusCode: 413, statusMessage: 'payload_too_large' })
  }
}

export const loginSchema = z.object({
  email: z.email().max(254),
  password: z.string().min(1).max(200),
})

export const mfaVerifySchema = z.object({
  code: z.string().regex(/^\d{6}$/),
})

export const requestListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(10_000).default(1),
  status: z.enum(REQUEST_STATUSES).optional(),
  category: z.string().trim().max(50).optional(),
  q: z.string().trim().max(100).optional(),
})

export const messageListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(10_000).default(1),
  status: z.enum(MESSAGE_STATUSES).optional(),
})

export const messageStatusSchema = z.object({ status: z.enum(MESSAGE_STATUSES) })

export const ADMIN_PAGE_SIZE = 20

/**
 * Makes free-text search safe to embed in a PostgREST `or=(...)` filter.
 * Commas, parentheses and dots would otherwise let the text inject extra
 * filter clauses; %, _ and * are LIKE wildcards. All are stripped.
 */
export function sanitizeSearch(q: string | undefined): string | null {
  const cleaned = (q ?? '').replace(/[,().%_*\\:"']/g, ' ').replace(/\s+/g, ' ').trim()
  return cleaned.length >= 2 ? cleaned : null
}

// ---------------------------------------------------------------------------
// Editable content (dashboard)
// ---------------------------------------------------------------------------

/** Trimmed text; empty string becomes null so "cleared" really clears. */
const nullableText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullable()
    .transform((v) => (v ? v : null))

export const settingsSchema = z.object({
  orders_completed: z.number().int().min(0).max(10_000_000).nullable(),
  years_experience: z.number().int().min(0).max(80).nullable(),
  freelance_license_number: nullableText(50),
  contact_email: z.union([z.email().max(254), z.literal(''), z.null()]).transform((v) => v || null),
  // International format, digits only: 9665XXXXXXXX
  whatsapp: z.union([z.string().regex(/^[0-9]{8,15}$/), z.literal(''), z.null()]).transform((v) => v || null),
})

export const testimonialSchema = z.object({
  name: z.string().trim().min(1).max(100),
  text: z.string().trim().min(1).max(1000),
  sort_order: z.number().int().min(0).max(10_000).default(0),
  is_published: z.boolean().default(true),
})

/** Slugs are URL/form identifiers: fixed once created, so only on create. */
export const categoryCreateSchema = z.object({
  slug: z.string().regex(/^[a-z][a-z0-9-]{1,39}$/),
  name_ar: z.string().trim().min(1).max(80),
  name_en: z.string().trim().min(1).max(80),
  description_ar: nullableText(200),
  description_en: nullableText(200),
  sort_order: z.number().int().min(0).max(10_000).default(0),
  is_active: z.boolean().default(true),
})
export const categoryUpdateSchema = categoryCreateSchema.omit({ slug: true })

/**
 * An external image link. https only: an http link is blocked as mixed
 * content on a secure page, and would send the visitor's request in clear
 * text. The host is not restricted — but note that whoever serves the
 * image can see every visitor's IP (documented in docs/SECURITY.md).
 */
const externalImageUrl = z
  .union([z.url().max(500).startsWith('https://'), z.literal(''), z.null()])
  .transform((v) => v || null)

export const portfolioSchema = z.object({
  category_id: z.uuid().nullable(),
  image_url: externalImageUrl,
  title_ar: z.string().trim().min(1).max(120),
  title_en: z.string().trim().min(1).max(120),
  description_ar: nullableText(500),
  description_en: nullableText(500),
  sort_order: z.number().int().min(0).max(10_000).default(0),
  is_published: z.boolean().default(true),
})

export const requestNoteSchema = z.object({
  body: z.string().trim().min(1).max(5000),
})

export const requestUpdateSchema = z
  .object({
    status: z.enum(REQUEST_STATUSES).optional(),
    // The admin can correct what the client typed (a typo in an email,
    // a phone number given later by phone). Every change is audited.
    full_name: z.string().trim().min(2).max(100).optional(),
    email: z.email().max(254).optional(),
    phone: z.union([z.string().trim().regex(/^\+?[0-9\s-]{7,20}$/), z.literal(''), z.null()]).transform((v) => v || null).optional(),
    company_name: nullableText(150).optional(),
    details: z.string().trim().min(10).max(5000).optional(),
    quoted_price: z.number().min(0).max(100_000_000).multipleOf(0.01).nullable().optional(),
    due_date: z.iso.date().nullable().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: 'empty_update' })

// ---------------------------------------------------------------------------
// Client accounts
// ---------------------------------------------------------------------------

/** 10 characters minimum — longer than Supabase's default, and easy to meet. */
const clientPassword = z.string().min(10).max(200)

export const clientRegisterSchema = z.object({
  email: z.email().max(254),
  password: clientPassword,
  full_name: z.string().trim().min(2).max(100),
  phone: z.union([z.string().trim().regex(/^\+?[0-9\s-]{7,20}$/), z.literal(''), z.null()]).transform((v) => v || null),
  company_name: nullableText(150),
  consentPrivacy: z.literal(true),
  website: z.string().max(200).optional().default(''), // honeypot
})

export const clientLoginSchema = z.object({
  email: z.email().max(254),
  password: z.string().min(1).max(200),
})

export const clientProfileSchema = clientRegisterSchema.pick({ full_name: true, phone: true, company_name: true })

export const messageSchema = z.object({
  body: z.string().trim().min(1).max(5000),
})

// ---------------------------------------------------------------------------
// Attachments added to an existing request by its owner
// ---------------------------------------------------------------------------

const declaredFile = z.object({
  name: z.string().min(1).max(255),
  size: z.number().int().positive().max(MAX_ATTACHMENT_BYTES),
  type: z.string().refine(isAllowedAttachmentType, { message: 'type_not_allowed' }),
})

export const clientAttachmentsInitSchema = z.object({
  files: z.array(declaredFile).min(1).max(MAX_ATTACHMENTS),
})

export const clientAttachmentsFinalizeSchema = z.object({
  files: z
    .array(
      z.object({
        // Paths are issued by the server; this only accepts that shape back.
        path: z.string().max(200),
        name: z.string().min(1).max(255),
        type: z.string().refine(isAllowedAttachmentType, { message: 'type_not_allowed' }),
      })
    )
    .min(1)
    .max(MAX_ATTACHMENTS),
})
