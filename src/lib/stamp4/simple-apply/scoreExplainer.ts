import { RAJ_PROFILE } from './profile'
import type { ParsedJob, ProofMapping, ScoreBreakdown } from './types'

export interface ScoreExplanation {
  dimension: string
  points: number
  cap: number
  reason: string
}

function explainRoleFit(points: number, parsed: ParsedJob): string {
  const title = parsed.roleTitle || 'The role title'
  if (points === 20) return `"${title}" is an exact match for your target role lane.`
  if (points === 12) return `"${title}" combines "analyst" with "system" or "business" - close to your lane, but not an exact match.`
  if (points === 5) return `"${title}" is a generic analyst title with no specific lane signal.`
  return `"${title}" has no analyst/target-lane signal at all.`
}

function explainDomainFit(parsed: ParsedJob): string {
  if (!parsed.domainKeywords.length) return 'No FinTech/banking/payments domain keywords were detected in the JD.'
  return `Matched ${parsed.domainKeywords.length} domain keyword${parsed.domainKeywords.length === 1 ? '' : 's'}: ${parsed.domainKeywords.join(', ')} (4 pts each, capped at 20).`
}

function explainSkillFit(parsed: ParsedJob): string {
  const matched = parsed.requiredSkills.filter((skill) =>
    RAJ_PROFILE.coreSkills.includes(skill as (typeof RAJ_PROFILE.coreSkills)[number]),
  )
  if (!matched.length) return 'None of your core skills (SQL, UAT, Jira, defect, incident, production support, etc.) were detected.'
  return `Matched ${matched.length} of your core skills: ${matched.join(', ')} (2.5 pts each, capped at 20).`
}

function explainPermitFit(parsed: ParsedJob): string {
  const parts: string[] = []
  const countryLower = parsed.country.toLowerCase()
  const positiveCountry = countryLower === 'ireland' || countryLower === 'netherlands' || countryLower === 'eu'

  if (parsed.sponsorshipSignals.length) {
    parts.push(
      `Permit-risk phrase detected: "${parsed.sponsorshipSignals[0]}"${
        positiveCountry ? ' (softened - country is one of your targets)' : " (full penalty - not a target country)"
      }.`,
    )
  }

  if (countryLower === 'uk') {
    parts.push('UK location applies an extra penalty regardless of sponsorship wording.')
  }

  if (!parsed.salary) {
    parts.push('Salary wasn\'t stated, which applies a small penalty.')
  } else {
    parts.push(
      `Salary "${parsed.salary}" was checked against your €${RAJ_PROFILE.salaryPermitFloorEUR.toLocaleString()} floor and €${RAJ_PROFILE.salaryTargetRangeEUR.min.toLocaleString()}–€${RAJ_PROFILE.salaryTargetRangeEUR.max.toLocaleString()} target range.`,
    )
  }

  return parts.length ? parts.join(' ') : 'No permit risk, UK penalty or salary penalty applied - full marks.'
}

function explainProofStrength(proofs: ProofMapping[]): string {
  if (!proofs.length) {
    return 'None of your 6 proof-mapper rules (payment/reconciliation, SQL, UAT, incident/support, regulatory, stakeholder) matched this JD.'
  }
  return `Matched ${proofs.length} of your proof-mapper rules: ${proofs.map((proof) => proof.jdRequirement).join(', ')} (4 pts each, capped at 20).`
}

export function explainScore(score: ScoreBreakdown, parsed: ParsedJob, proofs: ProofMapping[]): ScoreExplanation[] {
  return [
    { dimension: 'Role fit', points: score.roleFit, cap: 20, reason: explainRoleFit(score.roleFit, parsed) },
    { dimension: 'Domain fit', points: score.domainFit, cap: 20, reason: explainDomainFit(parsed) },
    { dimension: 'Skill fit', points: score.skillFit, cap: 20, reason: explainSkillFit(parsed) },
    { dimension: 'Permit fit', points: score.permitFit, cap: 20, reason: explainPermitFit(parsed) },
    { dimension: 'Proof strength', points: score.proofStrength, cap: 20, reason: explainProofStrength(proofs) },
  ]
}
