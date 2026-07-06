import { describe, expect, it } from 'vitest'
import { computeDashboardStats } from './dashboardStats'
import type { ScoreBreakdown, TrackedJob } from './types'

function job(overrides: Partial<TrackedJob> = {}): TrackedJob {
  return {
    id: Math.random().toString(36),
    company: 'Acme',
    roleTitle: 'Systems Analyst',
    country: 'Ireland',
    location: 'Dublin',
    salary: null,
    score: 70,
    decision: 'Apply with Proof Fix',
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

function breakdown(
  roleFit: number,
  domainFit: number,
  skillFit: number,
  permitFit: number,
  proofStrength: number,
): ScoreBreakdown {
  return {
    roleFit,
    domainFit,
    skillFit,
    permitFit,
    proofStrength,
    total: roleFit + domainFit + skillFit + permitFit + proofStrength,
    decision: 'Apply Now',
  }
}

describe('computeDashboardStats', () => {
  it('returns zeroed/null stats for an empty tracker', () => {
    const stats = computeDashboardStats([])
    expect(stats).toEqual({
      totalTracked: 0,
      averageScore: null,
      applicationRate: null,
      weakestDimension: null,
      countrySplit: [],
    })
  })

  it('computes average score and application rate across mixed statuses', () => {
    const jobs = [
      job({ score: 80, status: 'Applied' }),
      job({ score: 60, status: 'Saved' }),
      job({ score: 40, status: 'Interview' }),
      job({ score: 90, status: 'Rejected' }),
    ]
    const stats = computeDashboardStats(jobs)

    expect(stats.totalTracked).toBe(4)
    expect(stats.averageScore).toBe(67.5)
    expect(stats.applicationRate).toBe(50) // Applied + Interview = 2/4
  })

  it('finds the dimension most often weakest, ignoring jobs with no breakdown saved', () => {
    const jobs = [
      job({ scoreBreakdown: breakdown(20, 20, 20, 5, 15) }), // permitFit weakest
      job({ scoreBreakdown: breakdown(5, 20, 20, 20, 20) }), // roleFit weakest
      job({ scoreBreakdown: breakdown(5, 20, 20, 20, 20) }), // roleFit weakest again
      job({}), // no breakdown at all - excluded
    ]
    const stats = computeDashboardStats(jobs)

    expect(stats.weakestDimension).toEqual({ label: 'Role fit', timesWeakest: 2 })
  })

  it('returns null weakestDimension when no tracked job has a saved breakdown', () => {
    const jobs = [job({}), job({})]
    expect(computeDashboardStats(jobs).weakestDimension).toBeNull()
  })

  it('computes a country split sorted by count descending', () => {
    const jobs = [
      job({ country: 'Ireland' }),
      job({ country: 'Ireland' }),
      job({ country: 'Netherlands' }),
      job({ country: '' }),
    ]
    const stats = computeDashboardStats(jobs)

    expect(stats.countrySplit).toEqual([
      { country: 'Ireland', count: 2, percentage: 50 },
      { country: 'Netherlands', count: 1, percentage: 25 },
      { country: 'Unknown', count: 1, percentage: 25 },
    ])
  })
})
