import { describe, expect, it } from 'vitest'
import { computeFunnelInsights } from './funnelInsights'
import type { TrackedJob } from '../types'

function job(overrides: Partial<TrackedJob> = {}): TrackedJob {
  return { id: Math.random().toString(36), company: 'Acme', roleTitle: 'Analyst', country: 'Ireland', location: 'Dublin', salary: null, score: 4, decision: 'Apply Now', status: 'Saved', dateAdded: '2026-07-01', notes: '', generatedPack: { tailoredCvSummary: '', topCvBullets: [], coverMessage: '', recruiterLinkedInMessage: '', whyMeAnswer: '', projectProofParagraph: '' }, proofMap: [], correctionActions: [], ...overrides }
}

describe('computeFunnelInsights', () => {
  it('computes conversion by country and sponsorship status', () => {
    const result = computeFunnelInsights([
      job({ status: 'Applied', sponsorshipStatus: 'Confirmed' }),
      job({ status: 'Interview', sponsorshipStatus: 'Confirmed' }),
      job({ country: 'Netherlands', status: 'Saved', sponsorshipStatus: 'Likely' }),
    ])
    expect(result.overall.applicationRate).toBe(67)
    expect(result.overall.interviewRate).toBe(50)
    expect(result.countries.find((row) => row.label === 'Ireland')?.interviewRate).toBe(50)
    expect(result.sponsorship.find((row) => row.label === 'Confirmed')?.applicationRate).toBe(100)
  })

  it('flags low application execution with a concrete action', () => {
    const result = computeFunnelInsights([job(), job(), job({ status: 'Applied' })])
    expect(result.recommendations.some((item) => item.title === 'Application execution gap')).toBe(true)
  })
})