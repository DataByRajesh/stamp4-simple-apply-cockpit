import { RAJ_PROFILE } from './profile'
import type { ParsedJob, ScoreBreakdown } from './types'

export type SeniorityVerdict = 'matched' | 'moderate-stretch' | 'overreach'

export interface SeniorityFitExplanation {
  verdict: SeniorityVerdict
  requiredYears: number | null
  yearsGap: number | null
  hasSeniorTitle: boolean
  headline: string
  guidance: string
  cappedDecision: boolean
}

const SENIOR_KEYWORDS = ['senior', 'lead', 'principal', 'manager']

function extractRequiredYears(signals: string[]): number | null {
  for (const signal of signals) {
    const match = signal.match(/(\d+)\+?\s*years?/i)
    if (match) return Number(match[1])
  }
  return null
}

export function explainSeniorityFit(parsed: ParsedJob, score: ScoreBreakdown): SeniorityFitExplanation {
  const signals = parsed.senioritySignals.map((signal) => signal.toLowerCase())
  const hasSeniorTitle = signals.some((signal) => SENIOR_KEYWORDS.includes(signal))
  const requiredYears = extractRequiredYears(parsed.senioritySignals)
  const yearsGap = requiredYears !== null ? requiredYears - RAJ_PROFILE.yearsExperience : null

  // Mirrors the seniorityFit <= 1 threshold in scoreJob() that caps the decision -
  // keep this in sync so the panel's verdict always agrees with what actually happened to the score.
  const cappedDecision = score.seniorityFit <= 1

  let verdict: SeniorityVerdict = 'matched'
  if (cappedDecision) verdict = 'overreach'
  else if (hasSeniorTitle || (yearsGap !== null && yearsGap > 0)) verdict = 'moderate-stretch'

  let headline: string
  let guidance: string

  if (verdict === 'matched') {
    headline = 'No seniority mismatch detected for this role.'
    guidance = 'Apply on the merits of the role and domain fit alone - no experience-gap framing needed.'
  } else if (verdict === 'moderate-stretch') {
    const parts: string[] = []
    if (hasSeniorTitle) parts.push('the title itself signals a senior-level role')
    if (yearsGap !== null && yearsGap > 0) {
      parts.push(`the JD asks for ${requiredYears}+ years against your ${RAJ_PROFILE.yearsExperience}`)
    }
    headline = `Worth a stretch, not a given - ${parts.join(' and ')}.`
    guidance =
      'Still worth applying, but pre-empt the gap directly rather than hoping it goes unnoticed: lead with the specific ' +
      'depth of your portfolio work (PayGuard IE, the Cockpit itself) as evidence of analyst-level ownership, rather than years.'
  } else {
    const parts: string[] = []
    if (hasSeniorTitle) parts.push('a Senior/Lead/Principal-titled role')
    if (yearsGap !== null && yearsGap > 0) {
      parts.push(`${requiredYears}+ years required vs your ${RAJ_PROFILE.yearsExperience} (a ${yearsGap}-year gap)`)
    }
    headline = `Real overreach - ${parts.join(', ')}. The score would clear Apply Now on other dimensions alone, so this has been capped.`
    guidance =
      "This one is a genuine stretch, not just a framing exercise. If you apply, don't lead with years at all - lead with " +
      'a specific, narrow claim of depth (e.g. "3 years hands-on payments engineering plus two self-directed analyst-scope ' +
      'builds") and expect the interview, if you get one, to test that claim hard. Consider whether this application slot ' +
      'is better spent on a role closer to your actual level while volume is still low.'
  }

  return { verdict, requiredYears, yearsGap, hasSeniorTitle, headline, guidance, cappedDecision }
}
