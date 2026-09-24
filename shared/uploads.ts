/**
 * Attachment limits — the single source of truth for both the browser
 * (instant feedback in the form) and the server (actual enforcement).
 * Also mirrored in SQL: storage bucket config in 0003_storage_buckets.sql
 * and the size check on request_attachments in 0001_init_schema.sql.
 * Change all three together.
 */
/** Files a client may attach in one go (first submission, or a later addition). */
export const MAX_ATTACHMENTS = 3
/** Total files one request can ever hold, across all additions. */
export const MAX_ATTACHMENTS_PER_REQUEST = 10
export const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024 // 10 MB

/** Allowed MIME type -> extension used for the stored file name. */
export const ALLOWED_ATTACHMENT_TYPES = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'application/pdf': 'pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
} as const

export type AllowedAttachmentType = keyof typeof ALLOWED_ATTACHMENT_TYPES

export function isAllowedAttachmentType(type: string): type is AllowedAttachmentType {
  return Object.hasOwn(ALLOWED_ATTACHMENT_TYPES, type)
}

export const ATTACHMENTS_BUCKET = 'request-attachments'
