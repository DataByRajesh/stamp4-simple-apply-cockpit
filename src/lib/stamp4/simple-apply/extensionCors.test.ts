import { describe, expect, it } from 'vitest'
import { extensionCorsHeaders, extensionCorsPreflightResponse } from './extensionCors'

describe('extensionCorsHeaders', () => {
  it('reflects a chrome-extension origin', () => {
    const request = new Request('https://example.com', { headers: { origin: 'chrome-extension://abcdefghij' } })
    const headers = extensionCorsHeaders(request) as Record<string, string>
    expect(headers['Access-Control-Allow-Origin']).toBe('chrome-extension://abcdefghij')
    expect(headers['Access-Control-Allow-Methods']).toContain('POST')
  })

  it('returns no CORS headers for a non-extension origin', () => {
    const request = new Request('https://example.com', { headers: { origin: 'https://evil.example.com' } })
    expect(extensionCorsHeaders(request)).toEqual({})
  })

  it('returns no CORS headers when no origin header is present (same-origin request)', () => {
    const request = new Request('https://example.com')
    expect(extensionCorsHeaders(request)).toEqual({})
  })
})

describe('extensionCorsPreflightResponse', () => {
  it('returns a 204 with CORS headers for an extension origin', () => {
    const request = new Request('https://example.com', { headers: { origin: 'chrome-extension://abcdefghij' } })
    const response = extensionCorsPreflightResponse(request)
    expect(response.status).toBe(204)
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('chrome-extension://abcdefghij')
  })
})
