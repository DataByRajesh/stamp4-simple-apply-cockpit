import { describe, expect, it } from 'vitest'
import { mapProofs } from './proofMapper'
import type { ParsedJob } from './types'

function jobWithText(rawText: string): ParsedJob {
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
    rawText,
  }
}

function requirements(rawText: string) {
  return mapProofs(jobWithText(rawText)).map((proof) => proof.jdRequirement)
}

describe('mapProofs', () => {
  it('maps payment/reconciliation/settlement language to the Payment reconciliation proof', () => {
    expect(requirements('Experience with payment reconciliation is required.')).toContain('Payment reconciliation')
    expect(requirements('Handles settlement processing.')).toContain('Payment reconciliation')
  })

  it('maps sql/data validation language to the SQL/data validation proof', () => {
    expect(requirements('Strong SQL skills needed.')).toContain('SQL/data validation')
    expect(requirements('Data validation across reports.')).toContain('SQL/data validation')
  })

  it('maps uat/jira/testing/defect language to the UAT/testing proof', () => {
    expect(requirements('Own UAT test cycles.')).toContain('UAT/testing')
    expect(requirements('Log defects in Jira.')).toContain('UAT/testing')
  })

  it('maps incident/application support language to the support-investigation proof', () => {
    expect(requirements('Provide application support and monitor logs.')).toContain(
      'Application support/incident investigation',
    )
  })

  it('maps compliance/regulatory/kyc/aml/dora language to the regulatory-awareness proof', () => {
    expect(requirements('Understanding of KYC and AML controls.')).toContain('Regulatory/compliance awareness')
    expect(requirements('DORA readiness experience.')).toContain('Regulatory/compliance awareness')
  })

  it('maps stakeholder/business-user/requirements language to the stakeholder proof', () => {
    expect(requirements('Gather requirements from business users.')).toContain('Stakeholder/business analysis')
  })

  it('returns an empty array when nothing matches', () => {
    expect(mapProofs(jobWithText('Completely unrelated marketing copy.'))).toEqual([])
  })

  it('does not duplicate a rule when its keywords appear multiple times', () => {
    const text = 'SQL SQL SQL data validation data validation'
    expect(requirements(text).filter((r) => r === 'SQL/data validation')).toHaveLength(1)
  })
})
