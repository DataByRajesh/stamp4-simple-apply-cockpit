import { describe, expect, it } from 'vitest'
import { parseJobDescription } from './parser'

const STRONG_FIT_JD = `Job Title: Financial Systems Analyst
Company: Wayflyer
Location: Dublin, Ireland
Salary: EUR 48,000 - 55,000 per annum

About the role:
We are looking for a Financial Systems Analyst to join our payments team.

Requirements:
- SQL and data validation experience
- UAT and testing experience
- Experience with reconciliation and settlement workflows
- Stakeholder management and requirements gathering

Preferred:
- Jira, Confluence
- Power BI

Must have right to work in Ireland. No sponsorship available.`

const LOW_FIT_JD = `Business Analyst - 6 month contract
Location: London, UK
Generic all industries retail business analyst wanted.`

describe('parseJobDescription', () => {
  it('extracts title, company, country, and salary from a labelled JD', () => {
    const parsed = parseJobDescription(STRONG_FIT_JD)

    expect(parsed.roleTitle).toBe('Financial Systems Analyst')
    expect(parsed.company).toBe('Wayflyer')
    expect(parsed.country).toBe('Ireland')
    expect(parsed.salary).toContain('48,000')
    expect(parsed.salary).toContain('55,000')
  })

  it('only matches required skills within the requirements section, not the preferred section', () => {
    const parsed = parseJobDescription(STRONG_FIT_JD)

    expect(parsed.requiredSkills).toEqual(
      expect.arrayContaining(['sql', 'data validation', 'uat', 'testing', 'stakeholder', 'requirements']),
    )
    expect(parsed.requiredSkills).not.toContain('jira')
    expect(parsed.niceToHaveSkills).toEqual(expect.arrayContaining(['jira', 'power bi', 'confluence']))
  })

  it('detects domain keywords and sponsorship/permit-risk phrases', () => {
    const parsed = parseJobDescription(STRONG_FIT_JD)

    expect(parsed.domainKeywords).toEqual(expect.arrayContaining(['payments', 'reconciliation', 'settlement']))
    expect(parsed.sponsorshipSignals).toEqual(expect.arrayContaining(['no sponsorship', 'must have right to work']))
  })

  it('matches a whole-word keyword against a pluralised form of it', () => {
    // 'workflows' in the JD should satisfy the core-skill keyword 'workflow' via the trailing s?.
    const parsed = parseJobDescription(STRONG_FIT_JD)
    expect(parsed.requiredSkills).toContain('workflow')
  })

  it('does not treat "EUR" as an EU location signal', () => {
    // Regression test: extractLocation previously did a plain substring check for 'eu', and 'EUR'
    // (the currency code) contains 'eu' as a substring, so any EUR salary line falsely tagged the
    // JD as EU-relevant. Location matching now requires a whole-word boundary.
    const parsed = parseJobDescription(STRONG_FIT_JD)
    expect(parsed.location).toBe('ireland, dublin')
  })

  it('falls back to the first line as the title and flags contract/no-salary/generic red flags', () => {
    const parsed = parseJobDescription(LOW_FIT_JD)

    expect(parsed.roleTitle).toBe('Business Analyst - 6 month contract')
    expect(parsed.company).toBe('Unknown company')
    expect(parsed.country).toBe('UK')
    expect(parsed.salary).toBeNull()
    expect(parsed.redFlags).toEqual(
      expect.arrayContaining(['6 month contract', 'salary not stated', 'generic all-industries wording']),
    )
  })

  it('returns empty arrays rather than throwing on JDs with no recognisable structure', () => {
    const parsed = parseJobDescription('Random unrelated text with no structure at all.')

    expect(parsed.requiredSkills).toEqual([])
    expect(parsed.domainKeywords).toEqual([])
    expect(parsed.sponsorshipSignals).toEqual([])
    expect(parsed.salary).toBeNull()
  })
})
