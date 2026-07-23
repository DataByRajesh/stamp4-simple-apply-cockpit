import { afterEach, describe, expect, it, vi } from 'vitest'
import { fetchUkSkilledWorkerSponsorRecords, fetchUkVerifiedSponsorNames } from './ukSponsorRegister'

const SAMPLE_PAGE_HTML = `
  <a href="https://assets.publishing.service.gov.uk/media/abc123/SP_-_Worker_and_Temporary_Worker_Web_Register_-_2026-07-23.csv">Download CSV</a>
`

const SAMPLE_CSV = [
  'Organisation Name,Town/City,County,Type & Rating,Route',
  'Wolters Kluwer,London,Not set,Worker (A rating),Skilled Worker',
  'Some Church,London,Not set,Worker (A rating),Tier 2 Ministers of Religion',
  'Duplicate Co,London,Not set,Worker (A rating),Skilled Worker',
  'Duplicate Co,Manchester,Not set,Worker (A rating),Skilled Worker',
].join('\n')

describe('fetchUkSkilledWorkerSponsorRecords', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('resolves the current CSV link from the GOV.UK page, then fetches and filters it', async () => {
    const fetchSpy = vi.fn().mockImplementation((url: string) => {
      if (url.includes('gov.uk/government/publications')) {
        return Promise.resolve({ ok: true, text: async () => SAMPLE_PAGE_HTML })
      }
      if (url.includes('assets.publishing.service.gov.uk')) {
        return Promise.resolve({ ok: true, text: async () => SAMPLE_CSV })
      }
      throw new Error(`Unexpected URL: ${url}`)
    })
    global.fetch = fetchSpy as unknown as typeof fetch

    const records = await fetchUkSkilledWorkerSponsorRecords()

    // Non-Skilled-Worker routes (e.g. Ministers of Religion) are excluded, and a company with
    // duplicate Skilled Worker rows (different towns) is deduplicated to a single record.
    expect(records).toEqual([
      { name: 'Wolters Kluwer', route: 'Skilled Worker', rating: 'Worker (A rating)' },
      { name: 'Duplicate Co', route: 'Skilled Worker', rating: 'Worker (A rating)' },
    ])
  })

  it('throws when the GOV.UK page fetch fails', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 503 }) as unknown as typeof fetch
    await expect(fetchUkSkilledWorkerSponsorRecords()).rejects.toThrow('UK sponsor register page fetch failed')
  })

  it('throws when no CSV link can be found on the page', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, text: async () => '<p>no link here</p>' }) as unknown as typeof fetch
    await expect(fetchUkSkilledWorkerSponsorRecords()).rejects.toThrow('Could not locate the current UK sponsor register CSV link')
  })

  it('throws when the CSV fetch itself fails', async () => {
    const fetchSpy = vi.fn().mockImplementation((url: string) => {
      if (url.includes('gov.uk/government/publications')) {
        return Promise.resolve({ ok: true, text: async () => SAMPLE_PAGE_HTML })
      }
      return Promise.resolve({ ok: false, status: 500 })
    })
    global.fetch = fetchSpy as unknown as typeof fetch

    await expect(fetchUkSkilledWorkerSponsorRecords()).rejects.toThrow('UK sponsor register CSV fetch failed')
  })
})

describe('fetchUkVerifiedSponsorNames', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns just the names from the Skilled Worker records', async () => {
    const fetchSpy = vi.fn().mockImplementation((url: string) => {
      if (url.includes('gov.uk/government/publications')) {
        return Promise.resolve({ ok: true, text: async () => SAMPLE_PAGE_HTML })
      }
      return Promise.resolve({ ok: true, text: async () => SAMPLE_CSV })
    })
    global.fetch = fetchSpy as unknown as typeof fetch

    const names = await fetchUkVerifiedSponsorNames()
    expect(names).toEqual(['Wolters Kluwer', 'Duplicate Co'])
  })
})
