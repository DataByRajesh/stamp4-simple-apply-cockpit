import { describe, expect, it } from 'vitest'
import { computePeriodComparison, computeWeeklyTrend } from './timeSeriesStats'
import type { TrackedJob } from '../types'

function job(overrides: Partial<TrackedJob> = {}): TrackedJob {
  return {
    id: Math.random().toString(36),
    company: 'Acme',
    roleTitle: 'Systems Analyst',
    country: 'Ireland',
    location: 'Dublin',
    salary: null,
    score: 4,
    decision: 'Apply Now',
    status: 'Saved',
    dateAdded: new Date().toISOString(),
    notes: '',
    generatedPack: {
      tailoredCvSummary: '',
      topCvBullets: [],
      coverMessage: '',
      recruiterLinkedInMessage: '',
      whyMeAnswer: '',
      projectProofParagraph: '',
    },
    proofMap: [],
    correctionActions: [],
    ...overrides,
  }
}

describe('computeWeeklyTrend', () => {
  it('returns an empty array for no jobs', () => {
    expect(computeWeeklyTrend([])).toEqual([])
  })

  it('groups jobs into the same week and averages their scores', () => {
    const jobs = [
      job({ dateAdded: '2026-01-05T10:00:00.000Z', score: 4 }),
      job({ dateAdded: '2026-01-06T10:00:00.000Z', score: 2 }),
    ]
    const trend = computeWeeklyTrend(jobs)

    expect(trend).toHaveLength(1)
    expect(trend[0].jobsAnalysed).toBe(2)
    expect(trend[0].avgScore).toBe(3)
  })

  it('sorts distinct weeks chronologically', () => {
    const jobs = [job({ dateAdded: '2026-03-01T00:00:00.000Z' }), job({ dateAdded: '2026-01-01T00:00:00.000Z' })]
    const trend = computeWeeklyTrend(jobs)

    expect(trend).toHaveLength(2)
    expect(trend[0].weekLabel < trend[1].weekLabel).toBe(true)
  })
})

describe('computePeriodComparison', () => {
  it('returns 0/0/0% when there are no jobs', () => {
    expect(computePeriodComparison([], 7)).toEqual({ current: 0, previous: 0, changePercent: 0 })
  })

  it('counts jobs in the current period vs the immediately preceding one', () => {
    const now = Date.now()
    const jobs = [
      job({ dateAdded: new Date(now - 1 * 24 * 60 * 60 * 1000).toISOString() }), // 1 day ago - current
      job({ dateAdded: new Date(now - 2 * 24 * 60 * 60 * 1000).toISOString() }), // 2 days ago - current
      job({ dateAdded: new Date(now - 10 * 24 * 60 * 60 * 1000).toISOString() }), // 10 days ago - previous
    ]
    const result = computePeriodComparison(jobs, 7)

    expect(result.current).toBe(2)
    expect(result.previous).toBe(1)
    expect(result.changePercent).toBe(100)
  })

  it('reports 100% change when there is current activity but none in the previous period', () => {
    const result = computePeriodComparison([job({ dateAdded: new Date().toISOString() })], 7)
    expect(result).toEqual({ current: 1, previous: 0, changePercent: 100 })
  })
})
