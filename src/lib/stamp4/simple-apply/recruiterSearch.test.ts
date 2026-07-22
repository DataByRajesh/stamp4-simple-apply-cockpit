import { describe, expect, it } from 'vitest'
import { buildRecruiterSearchUrl } from './recruiterSearch'

describe('buildRecruiterSearchUrl', () => {
  it('builds a LinkedIn people-search URL scoped to the company and recruiter keywords', () => {
    const url = buildRecruiterSearchUrl('Wolters Kluwer')

    expect(url.startsWith('https://www.linkedin.com/search/results/people/?')).toBe(true)
    expect(url).toContain(encodeURIComponent('Wolters Kluwer recruiter OR "talent acquisition"').replace(/%20/g, '+'))
  })

  it('trims whitespace from the company name', () => {
    const url = buildRecruiterSearchUrl('  Mastercard  ')
    expect(url).toContain('Mastercard')
    expect(url).not.toContain('++Mastercard')
  })

  it('falls back to a generic recruiter search when the company name is empty', () => {
    const url = buildRecruiterSearchUrl('')
    expect(url).toBe('https://www.linkedin.com/search/results/people/?keywords=recruiter+OR+%22talent+acquisition%22')
  })
})
