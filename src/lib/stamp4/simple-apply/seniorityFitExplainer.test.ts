import { describe, expect, it } from 'vitest'
import { scoreJob } from './scoring'
import { explainSeniorityFit } from './seniorityFitExplainer'
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

describe('explainSeniorityFit', () => {
  it('returns matched with no gap when there is no seniority signal', () => {
    const parsed = job({ roleTitle: 'Systems Analyst' })
    const result = explainSeniorityFit(parsed, scoreJob(parsed))
    expect(result.verdict).toBe('matched')
    expect(result.cappedDecision).toBe(false)
  })

  it('returns moderate-stretch for a small years gap that does not trigger the score cap', () => {
    const parsed = job({ roleTitle: 'Systems Analyst', senioritySignals: ['4+ years'] })
    const result = explainSeniorityFit(parsed, scoreJob(parsed))
    expect(result.verdict).toBe('moderate-stretch')
    expect(result.yearsGap).toBe(1)
    expect(result.cappedDecision).toBe(false)
  })

  it('returns overreach and flags the decision cap for a Senior title with a large years gap', () => {
    const parsed = job({ roleTitle: 'Senior Systems Analyst', senioritySignals: ['senior', '8+ years'] })
    const result = explainSeniorityFit(parsed, scoreJob(parsed))
    expect(result.verdict).toBe('overreach')
    expect(result.hasSeniorTitle).toBe(true)
    expect(result.requiredYears).toBe(8)
    expect(result.yearsGap).toBe(5)
    expect(result.cappedDecision).toBe(true)
    expect(result.headline).toContain('overreach')
  })

  it('keeps the verdict in sync with the scoring cap threshold (seniorityFit <= 1)', () => {
    const parsed = job({ roleTitle: 'Senior Systems Analyst', senioritySignals: ['senior'] })
    const score = scoreJob(parsed)
    const result = explainSeniorityFit(parsed, score)
    expect(result.cappedDecision).toBe(score.seniorityFit <= 1)
  })
})
