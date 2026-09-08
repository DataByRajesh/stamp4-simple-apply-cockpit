import { describe, expect, it } from 'vitest'
import { assessSponsorshipReadiness } from './sponsorshipReadiness'
import type { ParsedJob } from './types'
const job=(overrides:Partial<ParsedJob>={}):ParsedJob=>({roleTitle:'Business Systems Analyst',company:'FinTech',country:'Ireland',location:'Dublin',salary:'€55,000',requiredSkills:['sql'],niceToHaveSkills:[],tools:['sql'],domainKeywords:['payments'],responsibilities:['Map financial systems requirements'],sponsorshipSignals:[],redFlags:[],senioritySignals:[],workPattern:'hybrid',rawText:'Permanent Business Systems Analyst. Salary €55,000.',...overrides})
describe('sponsorship readiness',()=>{it('maps Ireland target lane',()=>{const r=assessSponsorshipReadiness(job());expect(r.occupationCode).toBe('SOC 2135');expect(r.salaryThresholdEUR).toBe(40904);expect(r.legalEligibility).toBeGreaterThan(70)});it('blocks no-sponsorship wording',()=>{const r=assessSponsorshipReadiness(job({rawText:'Must have right to work without sponsorship.'}));expect(r.blockers.length).toBeGreaterThan(0)});it('checks German threshold',()=>{const r=assessSponsorshipReadiness(job({country:'Germany',salary:'€48,000'}));expect(r.salaryThresholdEUR).toBe(50700);expect(r.blockers[0]).toContain('below')});it('checks UK Skilled Worker threshold, converting the GBP salary to EUR for comparison',()=>{const r=assessSponsorshipReadiness(job({country:'United Kingdom',salary:'£38,000',rawText:'Permanent Business Systems Analyst. Salary £38,000.'}));expect(r.jurisdiction).toBe('United Kingdom');expect(r.salaryThresholdEUR).toBe(Math.round(41700*1.17));expect(r.blockers[0]).toContain('below')})})

describe('sponsorship readiness - Netherlands', () => {
  it('checks the current flat age-30+ threshold and pathway', () => {
    const result = assessSponsorshipReadiness(
      job({ country: 'Netherlands', salary: 'EUR 75,000', rawText: 'Permanent Business Systems Analyst. Salary EUR 75,000.' }),
    )

    expect(result.jurisdiction).toBe('Netherlands')
    expect(result.salaryThresholdEUR).toBe(71304)
    expect(result.pathway).toContain('Highly Skilled Migrant')
  })

  it('blocks a salary below the current flat age-30+ threshold', () => {
    const result = assessSponsorshipReadiness(
      job({ country: 'Netherlands', salary: 'EUR 60,000', rawText: 'Permanent Business Systems Analyst. Salary EUR 60,000.' }),
    )

    expect(result.blockers[0]).toContain('below')
  })
})

describe('sponsorship readiness - additional branches', () => {
  it('boosts employer probability and records evidence for explicit sponsorship', () => {
    const withSignal = assessSponsorshipReadiness(
      job({ rawText: 'Permanent Business Systems Analyst. Salary EUR 55,000. We offer visa sponsorship and relocation support.' }),
    )
    const withoutSignal = assessSponsorshipReadiness(job())

    expect(withSignal.employerProbability).toBeGreaterThan(withoutSignal.employerProbability)
    expect(withSignal.evidence.some((e) => e.includes('sponsorship, permit or relocation-support signal'))).toBe(true)
    expect(withSignal.status).toBe('Eligible')
  })

  it('scores Medium occupation confidence below High', () => {
    const high = assessSponsorshipReadiness(job({ roleTitle: 'Business Systems Analyst' }))
    const medium = assessSponsorshipReadiness(
      job({ roleTitle: 'Data Analyst', rawText: 'Permanent Data Analyst. Salary EUR 55,000.' }),
    )

    expect(high.occupationConfidence).toBe('High')
    expect(medium.occupationConfidence).toBe('Medium')
    expect(medium.legalEligibility).toBeLessThan(high.legalEligibility)
  })

  it('uses Low confidence when no occupation mapping is recognised', () => {
    const result = assessSponsorshipReadiness(
      job({ roleTitle: 'Growth Marketing Lead', rawText: 'Permanent Growth Marketing Lead. Salary EUR 55,000.' }),
    )

    expect(result.occupationConfidence).toBe('Low')
    expect(result.occupationCode).toBe('Occupation mapping required')
  })

  it('flags a missing salary without silently applying a threshold pass', () => {
    const result = assessSponsorshipReadiness(
      job({ salary: null, rawText: 'Permanent Business Systems Analyst. Salary not disclosed.' }),
    )

    expect(result.salaryDetectedEUR).toBeNull()
    expect(result.confirmations.some((item) => item.includes('Salary is not stated'))).toBe(true)
    expect(result.nextActions.some((item) => item.includes('base salary range'))).toBe(true)
  })

  it('returns Ineligible or Unlikely for a hard blocker', () => {
    const result = assessSponsorshipReadiness(job({ rawText: 'Must have right to work without sponsorship.' }))
    expect(['Ineligible', 'Unlikely']).toContain(result.status)
  })

  it('requires confirmation for a plausible role without employer sponsorship evidence', () => {
    expect(assessSponsorshipReadiness(job()).status).toBe('Confirmation Required')
  })
})
