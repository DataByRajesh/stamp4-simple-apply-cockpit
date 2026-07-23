import { afterEach, describe, expect, it } from 'vitest'
import { checkAccessSecret } from './checkAccessSecret'
import { createSessionToken, SESSION_COOKIE } from './sessionAuth'

const ORIGINAL_SECRET = process.env.STAMP4_ACCESS_SECRET

describe('checkAccessSecret', () => {
  afterEach(() => {
    process.env.STAMP4_ACCESS_SECRET = ORIGINAL_SECRET
  })

  it('accepts a valid session cookie', () => {
    process.env.STAMP4_ACCESS_SECRET = 'test-secret'
    const token = createSessionToken()
    const request = new Request('https://example.com', { headers: { cookie: `${SESSION_COOKIE}=${token}` } })
    expect(checkAccessSecret(request)).toBe(true)
  })

  it('rejects a missing cookie and missing header', () => {
    process.env.STAMP4_ACCESS_SECRET = 'test-secret'
    const request = new Request('https://example.com')
    expect(checkAccessSecret(request)).toBe(false)
  })

  it('accepts a valid Bearer header carrying the shared secret (extension path)', () => {
    process.env.STAMP4_ACCESS_SECRET = 'test-secret'
    const request = new Request('https://example.com', { headers: { authorization: 'Bearer test-secret' } })
    expect(checkAccessSecret(request)).toBe(true)
  })

  it('rejects an incorrect Bearer token', () => {
    process.env.STAMP4_ACCESS_SECRET = 'test-secret'
    const request = new Request('https://example.com', { headers: { authorization: 'Bearer wrong-secret' } })
    expect(checkAccessSecret(request)).toBe(false)
  })

  it('rejects a malformed authorization header (no Bearer prefix) and falls through to cookie check', () => {
    process.env.STAMP4_ACCESS_SECRET = 'test-secret'
    const request = new Request('https://example.com', { headers: { authorization: 'test-secret' } })
    expect(checkAccessSecret(request)).toBe(false)
  })

  it('rejects an expired session cookie', () => {
    process.env.STAMP4_ACCESS_SECRET = 'test-secret'
    const request = new Request('https://example.com', { headers: { cookie: `${SESSION_COOKIE}=1.badexpiry` } })
    expect(checkAccessSecret(request)).toBe(false)
  })
})
