import { matchesTargetRoles } from './atsFeeds'
import { mapProofs } from './proofMapper'
import { parseJobDescription } from './parser'
import { scoreJob } from './scoring'
import type { ParsedJob, ProofMapping, ScoreBreakdown } from './types'

export interface ScoredPosting {
  parsed: ParsedJob
  score: ScoreBreakdown
  proofs: ProofMapping[]
}

/**
 * Builds the same "pasted JD" text shape the Cockpit's manual paste box expects, from ATS feed
 * fields - shared by scorePosting() and the "send to Cockpit" handoff so both stay in sync.
 */
export function buildJdRawText(companyName: string, title: string, location: string | null, descriptionText: string): string {
  return `Job Title: ${title}\nCompany: ${companyName}\nLocation: ${location ?? 'Unknown'}\n\n${descriptionText}`
}

export function isEmailWorthyMatch(decision: string, title: string, targetRoleLane: readonly string[]): boolean {
  return decision !== 'Skip' && matchesTargetRoles(title, targetRoleLane)
}

/**
 * Runs the same deterministic parser/scoring/proof-mapper used in the Cockpit against an ATS
 * feed posting, so the sponsor-company digest can be pre-scored instead of just title-matched.
 * No AI call involved - roleTitle/company come straight from the ATS feed (more reliable than
 * the regex heuristics parseJobDescription uses for messy pasted text); everything else
 * (skills, domain keywords, salary, location, permit signals) is extracted from the JD body.
 */
export function scorePosting(companyName: string, title: string, location: string | null, descriptionText: string): ScoredPosting {
  const rawText = buildJdRawText(companyName, title, location, descriptionText)
  const parsed = parseJobDescription(rawText)
  parsed.roleTitle = title
  parsed.company = companyName

  const score = scoreJob(parsed)
  const proofs = mapProofs(parsed)

  return { parsed, score, proofs }
}
