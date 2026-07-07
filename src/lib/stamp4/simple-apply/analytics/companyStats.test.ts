import { describe, expect, it } from 'vitest'
import { computeCompanyStats, computeSponsorFeedCompanyStats } from './companyStats'
import type { SeenSponsorPosting, TrackedJob } from '../types'

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

function posting(overrides: Partial<SeenSponsorPosting> = {}): SeenSponsorPosting {
  return {
    companyName: 'Adyen',
    title: 'Application Analyst',
    url: 'https://example.com',
    location: 'Amsterdam',
    scoreTotal: 4,
    decision: 'Apply Now',
    descriptionText: null,
    firstSeenAt: new Date().toISOString(),
    ...overrides,
  }
}

describe('computeCompanyStats', () => {
  it('returns an empty array for no jobs', () => {
    expect(computeCompanyStats([])).toEqual([])
  })

  it('groups by company, averages score, and picks the highest-scoring decision', () => {
    const jobs = [
      job({ company: 'Stripe', score: 4, decision: 'Apply Now' }),
      job({ company: 'Stripe', score: 2, decision: 'Skip' }),
      job({ company: 'Adyen', score: 3, decision: 'Apply with Proof Fix' }),
    ]
    const stats = computeCompanyStats(jobs)

    expect(stats).toEqual([
      { company: 'Stripe', jobCount: 2, avgScore: 3, bestDecision: 'Apply Now' },
      { company: 'Adyen', jobCount: 1, avgScore: 3, bestDecision: 'Apply with Proof Fix' },
    ])
  })

  it('sorts companies by average score descending', () => {
    const jobs = [job({ company: 'Low', score: 1 }), job({ company: 'High', score: 5 })]
    const stats = computeCompanyStats(jobs)
    expect(stats.map((s) => s.company)).toEqual(['High', 'Low'])
  })
})

describe('computeSponsorFeedCompanyStats', () => {
  it('returns an empty array for no postings', () => {
    expect(computeSponsorFeedCompanyStats([])).toEqual([])
  })

  it('ignores postings with a null score', () => {
    const postings = [posting({ scoreTotal: null })]
    expect(computeSponsorFeedCompanyStats(postings)).toEqual([])
  })

  it('averages score per company across postings', () => {
    const postings = [
      posting({ companyName: 'Adyen', scoreTotal: 4 }),
      posting({ companyName: 'Adyen', scoreTotal: 2 }),
    ]
    expect(computeSponsorFeedCompanyStats(postings)).toEqual([{ company: 'Adyen', postingCount: 2, avgScore: 3 }])
  })
})
