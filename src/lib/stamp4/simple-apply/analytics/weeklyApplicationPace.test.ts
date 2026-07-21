import { describe, expect, it } from 'vitest'
import { computeWeeklyApplicationPace, resolveAppliedDate } from './weeklyApplicationPace'
import type { TrackedJob } from '../types'

function job(overrides: Partial<TrackedJob> = {}): TrackedJob {
  return {
    id: Math.random().toString(36),
    company: 'Acme',
    roleTitle: 'Analyst',
    country: 'Ireland',
    location: 'Dublin',
    salary: null,
    score: 4,
    decision: 'Apply Now',
    status: 'Saved',
    dateAdded: '2026-07-01',
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

describe('resolveAppliedDate', () => {
  it('prefers the explicit submitted date over dateAdded', () => {
    const result = resolveAppliedDate(
      job({ dateAdded: '2026-01-01', applicationRecord: { ...EMPTY_RECORD, submittedAt: '2026-07-15' } }),
    )
    expect(result).toBe('2026-07-15')
  })

  it('falls back to updatedAt when no submitted date is recorded', () => {
    const result = resolveAppliedDate(job({ dateAdded: '2026-01-01', updatedAt: '2026-07-10' }))
    expect(result).toBe('2026-07-10')
  })

  it('falls back to dateAdded when nothing else is available', () => {
    const result = resolveAppliedDate(job({ dateAdded: '2026-07-01' }))
    expect(result).toBe('2026-07-01')
  })
})

describe('computeWeeklyApplicationPace', () => {
  it('only counts jobs with an applied-or-later status, not saved/qualified jobs', () => {
    const now = new Date().toISOString()
    const result = computeWeeklyApplicationPace(
      [job({ status: 'Applied', updatedAt: now }), job({ status: 'Saved', updatedAt: now }), job({ status: 'Qualified', updatedAt: now })],
      4,
    )
    expect(result.thisWeek.count).toBe(1)
    expect(result.totalApplied).toBe(1)
  })

  it('flags on track once the weekly target is met', () => {
    const now = new Date().toISOString()
    const result = computeWeeklyApplicationPace(
      [job({ status: 'Applied', updatedAt: now }), job({ status: 'Applied', updatedAt: now })],
      2,
    )
    expect(result.onTrack).toBe(true)
  })

  it('flags not on track when below the weekly target', () => {
    const now = new Date().toISOString()
    const result = computeWeeklyApplicationPace([job({ status: 'Applied', updatedAt: now })], 4)
    expect(result.onTrack).toBe(false)
  })

  it('works from a single application, unlike the score-based analytics views', () => {
    const now = new Date().toISOString()
    const result = computeWeeklyApplicationPace([job({ status: 'Applied', updatedAt: now })], 4)
    expect(result.totalApplied).toBe(1)
    expect(result.recentWeeks.length).toBe(6)
  })
})

const EMPTY_RECORD = {
  cvVersion: '',
  coverLetterVersion: '',
  jdSnapshot: '',
  submittedAt: '',
  confirmationNumber: '',
  portalUrl: '',
  deadline: '',
  proofPoints: '',
  missingActions: '',
  interviewMaterialsUrl: '',
  generatedDocuments: '',
}
