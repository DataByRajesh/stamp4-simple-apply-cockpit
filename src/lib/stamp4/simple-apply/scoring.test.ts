import { describe, expect, it } from 'vitest'
import { scoreJob } from './scoring'
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

describe('scoreJob - roleFit', () => {
  it('scores 20 for an exact target-lane title', () => {
    expect(scoreJob(job({ roleTitle: 'Systems Analyst' })).roleFit).toBe(20)
  })

  it('scores 12 for "analyst" combined with "business" or "system" outside the target lane', () => {
    expect(scoreJob(job({ roleTitle: 'Business Analyst' })).roleFit).toBe(12)
  })

  it('scores 5 for a bare "analyst" title', () => {
    expect(scoreJob(job({ roleTitle: 'Data Analyst' })).roleFit).toBe(5)
  })

  it('scores 0 for a title with no analyst signal', () => {
    expect(scoreJob(job({ roleTitle: 'Software Engineer' })).roleFit).toBe(0)
  })
})

describe('scoreJob - domainFit and skillFit', () => {
  it('caps domainFit at 20 (4 points per keyword)', () => {
    expect(scoreJob(job({ domainKeywords: ['fintech', 'banking'] })).domainFit).toBe(8)
    expect(scoreJob(job({ domainKeywords: ['fintech', 'banking', 'payments', 'risk', 'compliance'] })).domainFit).toBe(
      20,
    )
  })

  it('only counts requiredSkills that are in the core-skills vocabulary', () => {
    expect(scoreJob(job({ requiredSkills: ['sql', 'python'] })).skillFit).toBe(2.5)
  })

  it('caps skillFit at 20 (2.5 points per matched core skill)', () => {
    const eightCoreSkills = ['sql', 'uat', 'jira', 'testing', 'defect', 'incident', 'production support', 'application support']
    expect(scoreJob(job({ requiredSkills: eightCoreSkills })).skillFit).toBe(20)
  })
})

describe('scoreJob - proofStrength', () => {
  it('is 0 when no proof-mapper rules match the JD text', () => {
    expect(scoreJob(job({ rawText: 'no relevant keywords here' })).proofStrength).toBe(0)
  })

  it('caps at 20 even when all 6 proof-mapper rules match', () => {
    const rawText =
      'payment reconciliation settlement sql data validation uat testing incident application support logs ' +
      'monitoring compliance regulatory kyc stakeholder business user requirements'
    expect(scoreJob(job({ rawText })).proofStrength).toBe(20)
  })
})

describe('scoreJob - permitFit and salary', () => {
  it('applies only the missing-salary penalty when there is no permit risk', () => {
    expect(scoreJob(job({ sponsorshipSignals: [] })).permitFit).toBe(15) // 20 - 5 (no salary)
  })

  it('penalises permit risk less when the country is a positive target (Ireland/Netherlands/EU)', () => {
    const result = scoreJob(job({ sponsorshipSignals: ['no sponsorship'], country: 'Ireland', salary: '50000' }))
    expect(result.permitFit).toBe(17) // 20 - 8 (risk+positive) + 5 (salary >= target)
  })

  it('penalises permit risk more heavily outside positive countries', () => {
    const result = job({ sponsorshipSignals: ['no sponsorship'], country: 'Germany', salary: '42000' })
    expect(scoreJob(result).permitFit).toBe(5) // 20 - 15 (risk, non-positive) + 0 (between floor and target)
  })

  it('clamps permitFit at 0 for stacked UK + contract-risk + no-salary penalties', () => {
    const result = job({ sponsorshipSignals: ['contract'], country: 'UK', salary: null })
    expect(scoreJob(result).permitFit).toBe(0) // 20 - 15 - 10 - 5 = -10, clamped to 0
  })

  it('scores the salary component below the permit floor, between floor and target, and at/above target', () => {
    expect(scoreJob(job({ salary: '35000' })).permitFit).toBe(5) // 20 - 15 (below floor)
    expect(scoreJob(job({ salary: '42000' })).permitFit).toBe(20) // 20 + 0 (between floor and target)
    expect(scoreJob(job({ salary: '50000' })).permitFit).toBe(20) // 20 + 5, clamped
  })
})

describe('scoreJob - seniorityFit', () => {
  it('scores full marks when there is no seniority signal', () => {
    expect(scoreJob(job({})).seniorityFit).toBe(20)
  })

  it('penalises senior/lead/principal/manager keyword signals by 12', () => {
    expect(scoreJob(job({ senioritySignals: ['senior'] })).seniorityFit).toBe(8)
    expect(scoreJob(job({ senioritySignals: ['lead'] })).seniorityFit).toBe(8)
  })

  it('does not penalise a junior signal', () => {
    expect(scoreJob(job({ senioritySignals: ['junior'] })).seniorityFit).toBe(20)
  })

  it('does not penalise required years at or below the 3-year experience level', () => {
    expect(scoreJob(job({ senioritySignals: ['3 years experience'] })).seniorityFit).toBe(20)
    expect(scoreJob(job({ senioritySignals: ['2 years experience'] })).seniorityFit).toBe(20)
  })

  it('penalises an explicit years-required gap beyond 3 years, scaled by the gap and capped at -15', () => {
    expect(scoreJob(job({ senioritySignals: ['5+ years experience'] })).seniorityFit).toBe(10) // 20 - min(15, 2*5)
    expect(scoreJob(job({ senioritySignals: ['7+ years experience'] })).seniorityFit).toBe(5) // 20 - min(15, 4*5)
    expect(scoreJob(job({ senioritySignals: ['10+ years experience'] })).seniorityFit).toBe(5) // 20 - min(15, 7*5=35->15)
  })

  it('stacks the senior-keyword and years-gap penalties, clamped at 0', () => {
    expect(scoreJob(job({ senioritySignals: ['senior', '10+ years experience'] })).seniorityFit).toBe(0)
  })
})

describe('scoreJob - decision thresholds', () => {
  it('returns Apply Now at or above 96 (80% of the /120 max)', () => {
    const strong = job({
      roleTitle: 'Systems Analyst',
      domainKeywords: ['fintech', 'banking', 'payments', 'risk', 'compliance'],
      requiredSkills: ['sql', 'uat', 'jira', 'testing', 'defect', 'incident', 'production support', 'application support'],
      country: 'Ireland',
      salary: '50000',
      rawText:
        'payment reconciliation settlement sql data validation uat testing incident application support logs ' +
        'monitoring compliance regulatory kyc stakeholder business user requirements',
    })
    const result = scoreJob(strong)
    expect(result.total).toBe(120)
    expect(result.decision).toBe('Apply Now')
  })

  it('returns Apply with Proof Fix between 72 and 95', () => {
    const midHigh = job({
      roleTitle: 'Data Analyst', // roleFit 5
      domainKeywords: ['fintech', 'banking', 'payments'], // domainFit 12
      requiredSkills: ['sql', 'uat', 'jira', 'testing', 'defect', 'incident'], // skillFit 15
      country: 'Ireland',
      salary: '50000', // permitFit 20
      rawText: 'payment reconciliation sql data validation uat testing incident application support', // 4 rules -> proofStrength 16
    })
    const result = scoreJob(midHigh)
    expect(result.total).toBe(88) // 68 + seniorityFit 20
    expect(result.decision).toBe('Apply with Proof Fix')
  })

  it('returns Save / Low Priority between 48 and 71', () => {
    const midLow = job({
      roleTitle: 'Analyst', // roleFit 5
      domainKeywords: ['fintech', 'banking'], // domainFit 8
      requiredSkills: ['sql', 'uat'], // skillFit 5
      country: 'Germany',
      salary: null, // permitFit 15 (no risk, just missing-salary penalty)
      rawText: 'sql data validation uat testing', // 2 rules -> proofStrength 8
    })
    const result = scoreJob(midLow)
    expect(result.total).toBe(61) // 41 + seniorityFit 20
    expect(result.decision).toBe('Save / Low Priority')
  })

  it('returns Skip below 48', () => {
    const weak = job({
      roleTitle: 'Software Engineer',
      country: 'UK',
      sponsorshipSignals: ['contract'],
      salary: null,
    })
    const result = scoreJob(weak)
    expect(result.total).toBe(20) // 0 + seniorityFit 20
    expect(result.decision).toBe('Skip')
  })
})
