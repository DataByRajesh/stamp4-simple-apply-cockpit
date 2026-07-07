import { describe, expect, it } from 'vitest'
import { mapProofs } from './proofMapper'
import { scoreJob } from './scoring'
import { explainScore } from './scoreExplainer'
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

describe('explainScore', () => {
  it('returns all six dimensions in a fixed order with matching point/cap values', () => {
    const parsed = job({ roleTitle: 'Systems Analyst', domainKeywords: ['fintech'] })
    const score = scoreJob(parsed)
    const explanations = explainScore(score, parsed, mapProofs(parsed))

    expect(explanations.map((e) => e.dimension)).toEqual([
      'Role fit',
      'Domain fit',
      'Skill fit',
      'Permit fit',
      'Proof strength',
      'Seniority fit',
    ])
    expect(explanations.every((e) => e.cap === 20)).toBe(true)
    expect(explanations[0].points).toBe(score.roleFit)
    expect(explanations[1].points).toBe(score.domainFit)
  })

  it('explains an exact role-lane match', () => {
    const parsed = job({ roleTitle: 'Systems Analyst' })
    const explanations = explainScore(scoreJob(parsed), parsed, [])
    expect(explanations[0].reason).toContain('exact match')
  })

  it('names the matched domain keywords', () => {
    const parsed = job({ domainKeywords: ['fintech', 'banking'] })
    const explanations = explainScore(scoreJob(parsed), parsed, [])
    expect(explanations[1].reason).toContain('fintech, banking')
  })

  it('names the matched core skills', () => {
    const parsed = job({ requiredSkills: ['sql', 'uat'] })
    const explanations = explainScore(scoreJob(parsed), parsed, [])
    expect(explanations[2].reason).toContain('sql, uat')
  })

  it('cites the specific sponsorship phrase and non-target country for permit fit', () => {
    const parsed = job({ country: 'Germany', sponsorshipSignals: ['no sponsorship'] })
    const explanations = explainScore(scoreJob(parsed), parsed, [])
    expect(explanations[3].reason).toContain('no sponsorship')
    expect(explanations[3].reason).toContain('not a target country')
  })

  it('lists matched proof-mapper requirements for proof strength', () => {
    const parsed = job({ rawText: 'sql data validation uat testing' })
    const proofs = mapProofs(parsed)
    const explanations = explainScore(scoreJob(parsed), parsed, proofs)
    expect(explanations[4].reason).toContain('SQL/data validation')
    expect(explanations[4].reason).toContain('UAT/testing')
  })

  it('explains a clean permit fit with no penalties', () => {
    const parsed = job({ country: 'Ireland', salary: '50000' })
    const explanations = explainScore(scoreJob(parsed), parsed, [])
    expect(explanations[3].reason).toContain('50000')
  })

  it('explains a senior-keyword seniority mismatch', () => {
    const parsed = job({ senioritySignals: ['senior'] })
    const explanations = explainScore(scoreJob(parsed), parsed, [])
    expect(explanations[5].reason).toContain('"senior"-level role')
  })

  it('explains an explicit years-required seniority mismatch', () => {
    const parsed = job({ senioritySignals: ['7+ years experience'] })
    const explanations = explainScore(scoreJob(parsed), parsed, [])
    expect(explanations[5].reason).toContain('7+ years experience')
  })

  it('gives full marks with no penalty note when there is no seniority signal', () => {
    const parsed = job({})
    const explanations = explainScore(scoreJob(parsed), parsed, [])
    expect(explanations[5].reason).toContain('full marks')
  })
})
