import { RAJ_PROFILE, type CareerMobilityProfile } from './profile'
import { mapProofs } from './proofMapper'
import type { ParsedJob, ScoreBreakdown } from './types'

function roleFit(roleTitle: string, profile: CareerMobilityProfile) {
  const title = roleTitle.toLowerCase()
  if (profile.targetRoleLane.some((role) => title.includes(role))) return 5
  if (profile.adjacentRoleLane.some((role) => title.includes(role))) return 3.75
  if ((title.includes('analyst') && title.includes('system')) || (title.includes('analyst') && title.includes('business'))) return 3
  if (title.includes('analyst')) return 1.25
  return 0
}

function extractNumericSalary(salary: string | null) {
  if (!salary) return null

  const matches = Array.from(salary.matchAll(/(\d{4,6}|\d{2,3}(?:,\d{3})?)\s*(k)?/gi))
  const amounts = matches
    .map((match) => {
      const value = Number(match[1].replace(',', ''))
      if (Number.isNaN(value)) return null
      return match[2] || value < 1000 ? value * 1000 : value
    })
    .filter((value): value is number => value !== null)

  return amounts.length ? Math.min(...amounts) : null
}

function scoreSalaryComponent(salary: string | null, profile: CareerMobilityProfile) {
  const parsedAmount = extractNumericSalary(salary)

  if (!salary || parsedAmount === null) return -1.25
  if (parsedAmount < profile.salaryPermitFloorEUR) return -3.75
  if (parsedAmount >= profile.salaryTargetRangeEUR.min) return 1.25
  return 0
}

const SENIOR_KEYWORDS = ['senior', 'lead', 'principal', 'manager']

function extractRequiredYears(signals: string[]): number | null {
  for (const signal of signals) {
    const match = signal.match(/(\d+)\+?\s*years?/i)
    if (match) return Number(match[1])
  }
  return null
}

function scoreSeniorityFit(parsed: ParsedJob, profile: CareerMobilityProfile): number {
  const signals = parsed.senioritySignals.map((signal) => signal.toLowerCase())
  const hasSeniorKeyword = signals.some((signal) => SENIOR_KEYWORDS.includes(signal))
  const requiredYears = extractRequiredYears(parsed.senioritySignals)

  let seniorityFit = 5

  if (hasSeniorKeyword) seniorityFit -= 3
  if (requiredYears !== null && requiredYears > profile.yearsExperience) {
    seniorityFit -= Math.min(3.75, (requiredYears - profile.yearsExperience) * 1.25)
  }

  return Math.max(0, Math.min(5, seniorityFit))
}

export function scoreJob(parsed: ParsedJob, profile: CareerMobilityProfile = RAJ_PROFILE): ScoreBreakdown {
  const role = roleFit(parsed.roleTitle, profile)
  const domainFit = Math.min(5, parsed.domainKeywords.length)
  const matchedCoreSkills = parsed.requiredSkills.filter((skill) =>
    profile.coreSkills.includes(skill),
  )
  const skillFit = Math.min(5, matchedCoreSkills.length * 0.625)
  const hasPermitRisk = parsed.sponsorshipSignals.length > 0
  const countryLower = parsed.country.toLowerCase()
  const positiveCountry =
    countryLower === 'ireland' || countryLower === 'netherlands' || countryLower === 'eu'
  let permitFit = 5

  if (hasPermitRisk && !positiveCountry) permitFit -= 3.75
  if (hasPermitRisk && positiveCountry) permitFit -= 2
  if (countryLower === 'uk') permitFit -= 2.5
  permitFit += scoreSalaryComponent(parsed.salary, profile)

  permitFit = Math.max(0, Math.min(5, permitFit))

  const proofStrength = Math.min(5, mapProofs(parsed, profile).length)
  const seniorityFit = scoreSeniorityFit(parsed, profile)
  // Each dimension is scored out of 5 so new dimensions can be added later without
  // rebalancing a shared point pool; the verdict is their average, not their sum.
  const total = Math.round(((role + domainFit + skillFit + permitFit + proofStrength + seniorityFit) / 6) * 10) / 10
  let decision: ScoreBreakdown['decision'] =
    total >= 4
      ? 'Apply Now'
      : total >= 3
        ? 'Apply with Proof Fix'
        : total >= 2
          ? 'Save / Low Priority'
          : 'Skip'

  // A severe seniority mismatch (senior-titled or a large years-required gap) can otherwise be
  // averaged away by strong domain/skill/proof signals alone, sending someone into an interview
  // pitched well above their actual level - a bad outcome for both sides. Mirror the roleFit guard:
  // cap the decision so it can't reach Apply Now on seniority alone being diluted out.
  if (seniorityFit <= 1 && decision === 'Apply Now') {
    decision = 'Apply with Proof Fix'
  }

  // A title with zero relation to the target role lane can otherwise still get averaged up to an
  // Apply-tier verdict by strong domain/skill/proof signals alone (e.g. a Software Engineer JD that
  // happens to mention SQL and FinTech) - cap it at Save / Low Priority so role mismatch can't be
  // diluted away entirely. Skip is already lower, so it's left alone.
  if (role === 0 && decision !== 'Skip') {
    decision = 'Save / Low Priority'
  }

  return {
    roleFit: role,
    domainFit,
    skillFit,
    permitFit,
    proofStrength,
    seniorityFit,
    total,
    decision,
  }
}

