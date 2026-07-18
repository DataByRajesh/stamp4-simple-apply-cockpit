import { RAJ_PROFILE } from './profile'
import type { ParsedJob, ProofMapping } from './types'

function hasAny(text: string, words: string[]) {
  return words.some((word) => new RegExp(`\\b${word}\\b`, 'i').test(text))
}

export function mapProofs(parsed: ParsedJob): ProofMapping[] {
  const text = parsed.rawText.toLowerCase()
  const mappings: ProofMapping[] = []

  if (hasAny(text, ['payment', 'payments', 'reconciliation', 'settlement'])) {
    mappings.push({
      jdRequirement: 'Payment reconciliation',
      proofAsset: `${RAJ_PROFILE.proofAssets.fisFintech} + ${RAJ_PROFILE.proofAssets.payGuardIE}`,
      howToUse:
        'Reference the PayGuard IE mismatch-detection scenario: comparing payment vs settlement records on ID, amount, status, timestamp.',
    })
  }

  if (hasAny(text, ['sql', 'data validation'])) {
    mappings.push({
      jdRequirement: 'SQL/data validation',
      proofAsset: `${RAJ_PROFILE.proofAssets.fisFintech} + ${RAJ_PROFILE.proofAssets.payGuardIE}`,
      howToUse: 'Describe the SQL-based duplicate/mismatch detection logic built in PayGuard IE.',
    })
  }

  if (hasAny(text, ['uat', 'jira', 'testing', 'defect'])) {
    mappings.push({
      jdRequirement: 'UAT/testing',
      proofAsset: `FIS/Yalamanchili software testing experience + ${RAJ_PROFILE.proofAssets.payGuardIE}`,
      howToUse: 'Reference the 40-case UAT test pack and defect log built for PayGuard IE.',
    })
  }

  if (hasAny(text, ['incident', 'application support', 'logs', 'monitoring'])) {
    mappings.push({
      jdRequirement: 'Application support/incident investigation',
      proofAsset: 'FIS/Yalamanchili banking and payment application maintenance/support experience',
      howToUse:
        'Describe a real or scenario-based incident investigation: checking logs, database records, and reporting values.',
    })
  }

  if (hasAny(text, ['compliance', 'regulatory', 'kyc', 'aml', 'dora'])) {
    mappings.push({
      jdRequirement: 'Regulatory/compliance awareness',
      proofAsset: RAJ_PROFILE.proofAssets.regPulse,
      howToUse: "Reference RegPulse's DORA/PSD3 control-evidence tracking approach.",
    })
  }

  if (hasAny(text, ['stakeholder', 'business user', 'requirements'])) {
    mappings.push({
      jdRequirement: 'Stakeholder/business analysis',
      proofAsset: 'Business-user support + application analyst positioning',
      howToUse: 'Describe translating business requirements into technical/system specifications.',
    })
  }

  return mappings
}
