import { RAJ_PROFILE, type CareerMobilityProfile, type ProofAsset, type ProofTag } from './profile'
import type { ParsedJob, ProofMapping } from './types'

function hasAny(text: string, words: string[]) {
  return words.some((word) => new RegExp(`\\b${word}\\b`, 'i').test(text))
}

type RequirementRule = {
  tag: ProofTag
  jdRequirement: string
  keywords: string[]
  howToUse: (assets: ProofAsset[]) => string
}

const RULES: RequirementRule[] = [
  {
    tag: 'payments',
    jdRequirement: 'Payment reconciliation',
    keywords: ['payment', 'payments', 'reconciliation', 'settlement'],
    howToUse: () => 'Reference a real payment vs settlement mismatch-detection scenario: comparing records on ID, amount, status, timestamp.',
  },
  {
    tag: 'sql-data-validation',
    jdRequirement: 'SQL/data validation',
    keywords: ['sql', 'data validation'],
    howToUse: () => 'Describe SQL-based duplicate/mismatch detection logic you have actually built or used.',
  },
  {
    tag: 'uat-testing',
    jdRequirement: 'UAT/testing',
    keywords: ['uat', 'jira', 'testing', 'defect'],
    howToUse: () => 'Reference a real UAT test pack and defect log you have owned.',
  },
  {
    tag: 'incident-support',
    jdRequirement: 'Application support/incident investigation',
    keywords: ['incident', 'application support', 'logs', 'monitoring'],
    howToUse: () => 'Describe a real or scenario-based incident investigation: checking logs, database records, and reporting values.',
  },
  {
    tag: 'compliance-regulatory',
    jdRequirement: 'Regulatory/compliance awareness',
    keywords: ['compliance', 'regulatory', 'kyc', 'aml', 'dora'],
    howToUse: (assets) =>
      assets.length === 1
        ? `Reference ${assets[0].label}'s control-evidence tracking approach.`
        : 'Reference your control-evidence tracking approach.',
  },
  {
    tag: 'stakeholder-communication',
    jdRequirement: 'Stakeholder/business analysis',
    keywords: ['stakeholder', 'business user', 'requirements'],
    howToUse: () => 'Describe translating business requirements into technical/system specifications.',
  },
]

/**
 * Matches JD-requirement categories to whichever of the candidate's own
 * tagged proofAssets support them - see profile.ts's ProofAsset/ProofTag
 * for why this is tag-based rather than referencing specific project names.
 * A category with no matching tagged asset is skipped entirely rather than
 * given a fabricated fallback: no evidence recorded means no proof claimed.
 */
export function mapProofs(parsed: ParsedJob, profile: CareerMobilityProfile = RAJ_PROFILE): ProofMapping[] {
  const text = parsed.rawText.toLowerCase()
  const mappings: ProofMapping[] = []

  for (const rule of RULES) {
    if (!hasAny(text, rule.keywords)) continue

    const assets = profile.proofAssets.filter((asset) => asset.tags.includes(rule.tag))
    if (!assets.length) continue

    mappings.push({
      jdRequirement: rule.jdRequirement,
      proofAsset: assets.map((asset) => asset.description).join(' + '),
      howToUse: rule.howToUse(assets),
    })
  }

  return mappings
}
