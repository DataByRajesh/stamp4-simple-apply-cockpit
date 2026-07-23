import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const maybeSingle = vi.fn()
const upsert = vi.fn()

vi.mock('./supabaseServer', () => ({
  getSupabaseServer: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle,
        }),
      }),
      upsert,
    }),
  }),
}))

import { lookupRecruiterContacts } from './contactLookup'

describe('lookupRecruiterContacts', () => {
  const originalFetch = global.fetch
  const originalApiKey = process.env.APOLLO_API_KEY

  beforeEach(() => {
    process.env.APOLLO_API_KEY = 'test-key'
    maybeSingle.mockReset().mockResolvedValue({ data: null, error: null })
    upsert.mockReset().mockResolvedValue({ data: null, error: null })
  })

  afterEach(() => {
    global.fetch = originalFetch
    process.env.APOLLO_API_KEY = originalApiKey
    vi.restoreAllMocks()
  })

  it('throws when no company name is provided', async () => {
    await expect(lookupRecruiterContacts('   ')).rejects.toThrow('A company name is required')
  })

  it('throws when APOLLO_API_KEY is not configured', async () => {
    delete process.env.APOLLO_API_KEY
    await expect(lookupRecruiterContacts('Wolters Kluwer')).rejects.toThrow('Apollo is not configured')
  })

  it('returns a cached result without calling Apollo when a fresh cache entry exists', async () => {
    const fetchSpy = vi.fn()
    global.fetch = fetchSpy as unknown as typeof fetch
    maybeSingle.mockResolvedValue({
      data: {
        company_name: 'Wolters Kluwer',
        contacts: [{ name: 'Jane Doe', title: 'Recruiter', email: 'jane@example.com', emailStatus: 'verified', linkedInUrl: null }],
        fetched_at: new Date().toISOString(),
      },
      error: null,
    })

    const result = await lookupRecruiterContacts('Wolters Kluwer')

    expect(result.source).toBe('cache')
    expect(result.contacts).toHaveLength(1)
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('searches and enriches contacts via Apollo, then caches the result', async () => {
    const fetchSpy = vi.fn().mockImplementation((url: string) => {
      if (url.includes('mixed_people/api_search')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            people: [{ id: 'p1', name: 'Jane Doe', title: 'Technical Recruiter', linkedin_url: 'https://linkedin.com/in/jane' }],
          }),
        })
      }
      if (url.includes('people/match')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ person: { email: 'jane@example.com', email_status: 'verified' } }),
        })
      }
      throw new Error(`Unexpected URL: ${url}`)
    })
    global.fetch = fetchSpy as unknown as typeof fetch

    const result = await lookupRecruiterContacts('Wolters Kluwer', 3)

    expect(result.source).toBe('apollo')
    expect(result.contacts).toEqual([
      {
        name: 'Jane Doe',
        title: 'Technical Recruiter',
        email: 'jane@example.com',
        emailStatus: 'verified',
        linkedInUrl: 'https://linkedin.com/in/jane',
      },
    ])
    expect(upsert).toHaveBeenCalledOnce()
  })

  it('caps enrichment calls at maxContacts to conserve free-tier credits', async () => {
    const people = Array.from({ length: 10 }, (_, index) => ({
      id: `p${index}`,
      name: `Person ${index}`,
      title: 'Recruiter',
      linkedin_url: null,
    }))
    const enrichCalls: string[] = []
    const fetchSpy = vi.fn().mockImplementation((url: string, init: RequestInit) => {
      if (url.includes('mixed_people/api_search')) {
        return Promise.resolve({ ok: true, json: async () => ({ people }) })
      }
      if (url.includes('people/match')) {
        enrichCalls.push(String(init.body))
        return Promise.resolve({ ok: true, json: async () => ({ person: { email: null, email_status: null } }) })
      }
      throw new Error(`Unexpected URL: ${url}`)
    })
    global.fetch = fetchSpy as unknown as typeof fetch

    const result = await lookupRecruiterContacts('Big Corp', 3)

    expect(enrichCalls).toHaveLength(3)
    expect(result.contacts).toHaveLength(3)
  })
})
