import { RAJ_PROFILE } from './profile'
import type { ParsedJob, ScoreBreakdown } from './types'

export interface SkipReason {
  summary: string
  details: string[]
}

export function buildSkipReason(score: ScoreBreakdown, parsed: ParsedJob): SkipReason {
  const details: string[] = []

  if (score.roleFit === 0) {
    details.push(
      `Role title "${parsed.roleTitle}" doesn't match your target lane (Systems/Application/Business Analyst).`,
    )
  }

  if (score.domainFit < 2) {
    details.push('Few FinTech/banking/payments domain keywords were detected in the JD.')
  }

  if (score.skillFit < 2.5) {
    details.push('Few of your core skills (SQL, UAT, reconciliation, incident/production support, etc.) matched.')
  }

  if (score.permitFit < 2.5) {
    if (parsed.sponsorshipSignals.length) {
      details.push(
        `Permit risk: JD signals "${parsed.sponsorshipSignals[0]}"${
          parsed.country && !RAJ_PROFILE.targetCountries.some((country) => country.toLowerCase() === parsed.country.toLowerCase())
            ? ` and "${parsed.country}" isn't one of your target countries`
            : ''
        }.`,
      )
    } else {
      details.push('Salary is below your permit-safe floor, or the country/location is unclear.')
    }
  }

  if (score.proofStrength < 2) {
    details.push('Little of your existing proof evidence (PayGuard IE, RegPulse, FIS experience) maps to this JD.')
  }

  if (score.seniorityFit < 2) {
    details.push(
      `Seniority mismatch: this JD looks like it needs more scope/years than your ~${RAJ_PROFILE.yearsExperience} years of experience.`,
    )
  }

  return {
    summary: `Scored ${score.total}/5 (Skip) — below the threshold for generating application content.`,
    details: details.length ? details : ['Overall score is too low across multiple fit dimensions.'],
  }
}
