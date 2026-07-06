import { RAJ_PROFILE } from './profile'
import { mapProofs } from './proofMapper'
import type { ParsedJob, ScoreBreakdown } from './types'

function roleFit(roleTitle: string) {
  const title = roleTitle.toLowerCase()
  if (RAJ_PROFILE.targetRoleLane.some((role) => title.includes(role))) return 20
  if ((title.includes('analyst') && title.includes('system')) || (title.includes('analyst') && title.includes('business'))) return 12
  if (title.includes('analyst')) return 5
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

function scoreSalaryComponent(salary: string | null) {
  const parsedAmount = extractNumericSalary(salary)

  if (!salary || parsedAmount === null) return -5
  if (parsedAmount < RAJ_PROFILE.salaryPermitFloorEUR) return -15
  if (parsedAmount >= RAJ_PROFILE.salaryTargetRangeEUR.min) return 5
  return 0
}

export function scoreJob(parsed: ParsedJob): ScoreBreakdown {
  const role = roleFit(parsed.roleTitle)
  const domainFit = Math.min(20, parsed.domainKeywords.length * 4)
  const matchedCoreSkills = parsed.requiredSkills.filter((skill) =>
    RAJ_PROFILE.coreSkills.includes(skill as (typeof RAJ_PROFILE.coreSkills)[number]),
  )
  const skillFit = Math.min(20, matchedCoreSkills.length * 2.5)
  const hasPermitRisk = parsed.sponsorshipSignals.length > 0
  const countryLower = parsed.country.toLowerCase()
  const positiveCountry =
    countryLower === 'ireland' || countryLower === 'netherlands' || countryLower === 'eu'
  let permitFit = 20

  if (hasPermitRisk && !positiveCountry) permitFit -= 15
  if (hasPermitRisk && positiveCountry) permitFit -= 8
  if (countryLower === 'uk') permitFit -= 10
  permitFit += scoreSalaryComponent(parsed.salary)

  permitFit = Math.max(0, Math.min(20, permitFit))

  const proofStrength = Math.min(20, mapProofs(parsed).length * 4)
  const total = Math.round(role + domainFit + skillFit + permitFit + proofStrength)
  const decision: ScoreBreakdown['decision'] =
    total >= 80
      ? 'Apply Now'
      : total >= 60
        ? 'Apply with Proof Fix'
        : total >= 40
          ? 'Save / Low Priority'
          : 'Skip'

  return {
    roleFit: role,
    domainFit,
    skillFit,
    permitFit,
    proofStrength,
    total,
    decision,
  }
}

