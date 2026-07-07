import { describe, expect, it } from 'vitest'
import { parseJobDescription } from './parser'
import { scoreJob } from './scoring'

/**
 * A living, human-reviewable calibration table: the same JD body (SQL, UAT, application support,
 * FinTech/banking - Raj's actual core proof areas) with only the title varying, asserting the
 * decision a human would expect. This is what backs the role-lane/weighting design - re-run it
 * whenever RAJ_PROFILE.targetRoleLane/adjacentRoleLane or the scoring formula changes, so a
 * regression (e.g. a real title silently getting under-scored) is caught here instead of being
 * discovered later from a missed real job. Values were computed and verified against this exact
 * body, not assumed - domainFit differs slightly between titles because words like "risk" and
 * "compliance" are also domain keywords, so those titles pick up extra domain credit "Data" does not.
 */
const JD_BODY = `
Company: TestCo
Location: Dublin, Ireland
Salary: EUR 50,000 per annum

Requirements:
- SQL and data validation
- UAT and defect testing
- Application support and incident handling

This role has strong FinTech and banking exposure.
`.trim()

const CASES: Array<{ title: string; expectedDecision: string; note: string }> = [
  { title: 'Systems Analyst', expectedDecision: 'Apply Now', note: 'exact target-lane title' },
  { title: 'Application Analyst', expectedDecision: 'Apply Now', note: 'exact target-lane title' },
  { title: 'Junior Systems Analyst', expectedDecision: 'Apply Now', note: 'exact-lane phrase embedded in a longer title' },
  { title: 'Risk Analyst', expectedDecision: 'Apply Now', note: 'adjacent-lane title, boosted by "risk" also being a domain keyword' },
  { title: 'Compliance Analyst', expectedDecision: 'Apply Now', note: 'adjacent-lane title, boosted by "compliance" also being a domain keyword' },
  { title: 'Data Analyst', expectedDecision: 'Apply with Proof Fix', note: 'adjacent-lane title - Raj\'s one real tracked job' },
  { title: 'Business Analyst', expectedDecision: 'Apply with Proof Fix', note: 'generic business+analyst combo, not exact/adjacent' },
  { title: 'Analyst', expectedDecision: 'Apply with Proof Fix', note: 'bare analyst title, no lane signal at all' },
  {
    title: 'Software Engineer',
    expectedDecision: 'Save / Low Priority',
    note: 'zero role-lane signal - capped despite strong domain/skill/proof match underneath',
  },
]

describe('role-lane calibration (integration: parseJobDescription + scoreJob)', () => {
  it.each(CASES)('"$title" -> $expectedDecision ($note)', ({ title, expectedDecision }) => {
    const rawText = `Job Title: ${title}\n${JD_BODY}`
    const parsed = parseJobDescription(rawText)
    const score = scoreJob(parsed)
    expect(score.decision).toBe(expectedDecision)
  })

  it('never lets a zero role-fit title reach an Apply-tier decision, regardless of JD strength', () => {
    const rawText = `Job Title: Software Engineer\n${JD_BODY}\nrisk compliance regulatory kyc aml stakeholder business user requirements`
    const parsed = parseJobDescription(rawText)
    const score = scoreJob(parsed)
    expect(score.roleFit).toBe(0)
    expect(score.decision).not.toBe('Apply Now')
    expect(score.decision).not.toBe('Apply with Proof Fix')
  })
})
