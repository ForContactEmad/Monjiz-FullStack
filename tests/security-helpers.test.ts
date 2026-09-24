import { describe, expect, it } from 'vitest'
import { readJwtClaims } from '../server/utils/auth'
import { loginSchema, mfaVerifySchema, sanitizeSearch, serviceRequestSchema } from '../server/utils/validation'

const b64url = (o: object) => Buffer.from(JSON.stringify(o)).toString('base64url')

describe('sanitizeSearch — search text cannot inject PostgREST filters', () => {
  it('strips characters that would add filter clauses', () => {
    // Without sanitizing, this would append ",role.eq.admin" as a new OR clause.
    const s = sanitizeSearch('ali,role.eq.admin')
    expect(s).not.toMatch(/[,.]/)
  })

  it('strips LIKE wildcards and parentheses', () => {
    expect(sanitizeSearch('%_*()')).toBeNull()
    expect(sanitizeSearch('a%b')).toBe('a b')
  })

  it('keeps normal Arabic and English names', () => {
    expect(sanitizeSearch('محمد')).toBe('محمد')
    expect(sanitizeSearch('  Sara  Ali ')).toBe('Sara Ali')
  })

  it('ignores searches shorter than 2 characters', () => {
    expect(sanitizeSearch('a')).toBeNull()
    expect(sanitizeSearch(undefined)).toBeNull()
  })
})

describe('readJwtClaims', () => {
  it('reads the aal claim from a token payload', () => {
    const token = `${b64url({ alg: 'none' })}.${b64url({ aal: 'aal2', sub: 'u1' })}.sig`
    expect(readJwtClaims(token).aal).toBe('aal2')
  })

  it('returns an empty object for malformed tokens instead of throwing', () => {
    expect(readJwtClaims('not-a-jwt')).toEqual({})
    expect(readJwtClaims('a.%%%.c')).toEqual({})
  })
})

describe('input schemas', () => {
  const base = {
    categorySlug: 'design',
    details: 'I need a logo for my shop',
    fullName: 'Test User',
    email: 't@example.com',
    consentPrivacy: true,
  }

  it('requires explicit privacy consent (PDPL)', () => {
    expect(serviceRequestSchema.safeParse({ ...base, consentPrivacy: false }).success).toBe(false)
    expect(serviceRequestSchema.safeParse(base).success).toBe(true)
  })

  it('turns empty optional fields into null, not empty strings', () => {
    const r = serviceRequestSchema.parse({ ...base, phone: '', companyName: '  ' })
    expect(r.phone).toBeNull()
    expect(r.companyName).toBeNull()
  })

  it('rejects markup in the phone field', () => {
    expect(serviceRequestSchema.safeParse({ ...base, phone: '<script>' }).success).toBe(false)
  })

  it('accepts only 6-digit 2FA codes', () => {
    expect(mfaVerifySchema.safeParse({ code: '123456' }).success).toBe(true)
    expect(mfaVerifySchema.safeParse({ code: '12345' }).success).toBe(false)
    expect(mfaVerifySchema.safeParse({ code: '12345a' }).success).toBe(false)
  })

  it('rejects a login with an invalid email', () => {
    expect(loginSchema.safeParse({ email: 'nope', password: 'x' }).success).toBe(false)
  })
})
