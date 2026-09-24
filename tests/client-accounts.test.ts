import { describe, expect, it } from 'vitest'
import {
  clientLoginSchema,
  clientProfileSchema,
  clientRegisterSchema,
  messageSchema,
  serviceRequestSchema,
} from '../server/utils/validation'

const validRegistration = {
  email: 'client@example.com',
  password: 'a-long-enough-pw',
  full_name: 'Sara Ali',
  phone: '0500000000',
  company_name: 'Acme',
  consentPrivacy: true,
}

describe('clientRegisterSchema', () => {
  it('accepts a complete registration', () => {
    expect(clientRegisterSchema.safeParse(validRegistration).success).toBe(true)
  })

  it('requires a password of at least 10 characters', () => {
    expect(clientRegisterSchema.safeParse({ ...validRegistration, password: 'short123' }).success).toBe(false)
  })

  it('requires explicit privacy consent', () => {
    expect(clientRegisterSchema.safeParse({ ...validRegistration, consentPrivacy: false }).success).toBe(false)
  })

  it('treats empty optional fields as null', () => {
    const r = clientRegisterSchema.parse({ ...validRegistration, phone: '', company_name: '' })
    expect(r.phone).toBeNull()
    expect(r.company_name).toBeNull()
  })

  it('never lets a registration set its own role or id', () => {
    const r = clientRegisterSchema.parse({ ...validRegistration, id: 'x', role: 'admin' } as never)
    expect(r).not.toHaveProperty('id')
    expect(r).not.toHaveProperty('role')
  })

  it('keeps the profile schema to editable fields only', () => {
    const r = clientProfileSchema.parse({ ...validRegistration } as never)
    expect(Object.keys(r).sort()).toEqual(['company_name', 'full_name', 'phone'])
  })
})

describe('clientLoginSchema', () => {
  it('requires a valid email and a password', () => {
    expect(clientLoginSchema.safeParse({ email: 'client@example.com', password: 'x' }).success).toBe(true)
    expect(clientLoginSchema.safeParse({ email: 'nope', password: 'x' }).success).toBe(false)
    expect(clientLoginSchema.safeParse({ email: 'client@example.com', password: '' }).success).toBe(false)
  })
})

describe('serviceRequestSchema after accounts', () => {
  const base = { categorySlug: 'design', details: 'I need a logo for my shop', consentPrivacy: true }

  it('no longer accepts a name or email from the form (they come from the account)', () => {
    const r = serviceRequestSchema.parse({ ...base, fullName: 'Someone Else', email: 'victim@example.com' } as never)
    expect(r).not.toHaveProperty('fullName')
    expect(r).not.toHaveProperty('email')
  })

  it('still requires consent and details', () => {
    expect(serviceRequestSchema.safeParse({ ...base, consentPrivacy: false }).success).toBe(false)
    expect(serviceRequestSchema.safeParse({ ...base, details: 'short' }).success).toBe(false)
  })
})

describe('messageSchema', () => {
  it('rejects empty and oversized messages', () => {
    expect(messageSchema.safeParse({ body: '   ' }).success).toBe(false)
    expect(messageSchema.safeParse({ body: 'x'.repeat(5001) }).success).toBe(false)
    expect(messageSchema.safeParse({ body: 'When can you start?' }).success).toBe(true)
  })

  it('ignores any attempt to set the sender', () => {
    const r = messageSchema.parse({ body: 'hi', sender: 'admin' } as never)
    expect(r).not.toHaveProperty('sender')
  })
})
