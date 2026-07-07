import { describe, expect, it } from 'vitest'
import { scoreJob } from './scoring'
import { buildSkipReason } from './skipReason'
import type { ParsedJob } from './types'

function job(overrides: Partial<ParsedJob> = {}): ParsedJob {
  return {
    roleTitle: '',
    company: '',
    country: '',
    location: '',
    salary: null,
    requiredSkills: [],
    niceToHaveSkills: [],
    tools: [],
    domainKeywords: [],
    responsibilities: [],
    sponsorshipSignals: [],
    redFlags: [],
    senioritySignals: [],
    workPattern: null,
    rawText: '',
    ...overrides,
    }
}

describe('buildSkipReason', () => {
  it('summarises the score and threshold', () => {
    const parsed = job({ roleTitle: 'Software Engineer', country: 'UK', sponsorshipSignals: ['contract'] })
    const score = scoreJob(parsed)
    const reason = buildSkipReason(score, parsed)
    expect(reason.summary).toBe('Scored 0.8/5 (Skip) — below the threshold for generating application content.')
  })

  it('flags a mismatched role title', () => {
    const parsed = job({ roleTitle: 'Software Engineer' })
    const reason = buildSkipReason(scoreJob(parsed), parsed)
    expect(reason.details.some((detail) => detail.includes('Software Engineer'))).toBe(true)
  })

  it('flags permit risk with the specific sponsorship signal and non-target country', () => {
    const parsed = job({
      roleTitle: 'Software Engineer',
      country: 'UK',
      sponsorshipSignals: ['no sponsorship'],
    })
    const reason = buildSkipReason(scoreJob(parsed), parsed)
    expect(reason.details.some((detail) => detail.includes('no sponsorship') && detail.includes('UK'))).toBe(true)
  })

  it('flags unclear salary/location when there is no sponsorship signal but permit fit is still low', () => {
    const parsed = job({ roleTitle: 'Software Engineer', country: 'Germany', salary: '20000' })
    const reason = buildSkipReason(scoreJob(parsed), parsed)
    expect(reason.details.some((detail) => detail.includes('permit-safe floor'))).toBe(true)
  })

  it('falls back to a generic reason when nothing specific triggers', () => {
    const parsed = job({
      roleTitle: 'Systems Analyst',
      country: 'Ireland',
      salary: '50000',
      domainKeywords: ['fintech', 'banking'],
      requiredSkills: ['sql', 'uat'],
      rawText: 'sql uat',
    })
    const score = scoreJob(parsed)
    const reason = buildSkipReason(score, parsed)
    expect(reason.details.length).toBeGreaterThan(0)
  })
})
