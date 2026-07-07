import { describe, expect, it } from 'vitest'
import { computeKeywordCorrelations, computeSalaryTrend } from './patternInsights'
import type { ParsedJob, TrackedJob } from '../types'

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

function parsedJob(overrides: Partial<ParsedJob> = {}): ParsedJob {
  return {
    roleTitle: 'Systems Analyst',
    company: 'Acme',
    country: 'Ireland',
    location: 'Dublin',
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

describe('computeSalaryTrend', () => {
  it('returns an empty array when no job has a parseable salary', () => {
    expect(computeSalaryTrend([job({ salary: null })])).toEqual([])
  })

  it('extracts a numeric salary and averages per week', () => {
    const jobs = [
      job({ dateAdded: '2026-01-05T00:00:00.000Z', salary: 'EUR 50,000 per annum' }),
      job({ dateAdded: '2026-01-06T00:00:00.000Z', salary: '40000' }),
    ]
    const trend = computeSalaryTrend(jobs)

    expect(trend).toHaveLength(1)
    expect(trend[0].jobsWithSalary).toBe(2)
    expect(trend[0].avgSalaryEUR).toBe(45000)
  })

  it('skips jobs whose salary text has no extractable number', () => {
    const jobs = [job({ salary: 'Competitive' })]
    expect(computeSalaryTrend(jobs)).toEqual([])
  })
})

describe('computeKeywordCorrelations', () => {
  it('returns an empty array when no job has a saved parsedJob', () => {
    expect(computeKeywordCorrelations([job({})])).toEqual([])
  })

  it('excludes keywords that only appear on a single job', () => {
    const jobs = [job({ score: 4, parsedJob: parsedJob({ domainKeywords: ['fintech'] }) })]
    expect(computeKeywordCorrelations(jobs)).toEqual([])
  })

  it('averages score per keyword across jobs and sorts descending', () => {
    const jobs = [
      job({ score: 5, parsedJob: parsedJob({ domainKeywords: ['fintech'] }) }),
      job({ score: 3, parsedJob: parsedJob({ domainKeywords: ['fintech'] }) }),
      job({ score: 1, parsedJob: parsedJob({ requiredSkills: ['sql'] }) }),
      job({ score: 1, parsedJob: parsedJob({ requiredSkills: ['sql'] }) }),
    ]
    const signals = computeKeywordCorrelations(jobs)

    expect(signals).toEqual([
      { keyword: 'fintech', jobCount: 2, avgScore: 4 },
      { keyword: 'sql', jobCount: 2, avgScore: 1 },
    ])
  })
})
