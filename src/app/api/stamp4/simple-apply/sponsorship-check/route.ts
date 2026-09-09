import { NextResponse } from 'next/server'
import { assessSponsorshipReadiness } from '@/lib/stamp4/simple-apply/sponsorshipReadiness'
import type { MobilityProfile, ParsedJob } from '@/lib/stamp4/simple-apply/types'

// Service-to-service endpoint: AutoTime EU Apply calls this to get Stamp4's
// precise legal-eligibility assessment (real 2026 salary thresholds,
// occupation-code mapping) for UK/Ireland/Netherlands/Germany, composed
// alongside AutoTime's own broader text-signal fit score rather than
// replacing it - see the roadmap's "sponsorship-engine reconciliation"
// design. Deliberately a separate secret from STAMP4_ACCESS_SECRET (shared
// with the browser extension, gated on not exposing per-user data) and from
// CRON_SECRET (privileged background jobs) - this endpoint is stateless
// (no DB read/write, no tenant data at all, pure computation over the
// request body), but keeping the secret scoped to this one caller limits
// blast radius if either of the other two ever leaks.
function isAuthorized(request: Request): boolean {
  const secret = process.env.STAMP4_SPONSORSHIP_SERVICE_SECRET
  if (!secret) return false
  return request.headers.get('authorization') === `Bearer ${secret}`
}

const REQUIRED_STRING_FIELDS = ['roleTitle', 'country'] as const

type SponsorshipCheckRequest = {
  parsed: {
    roleTitle: string
    country: string
    salary?: string | null
    rawText?: string
    domainKeywords?: string[]
    requiredSkills?: string[]
    responsibilities?: string[]
  }
  mobility?: Partial<MobilityProfile>
}

function toParsedJob(input: SponsorshipCheckRequest['parsed']): ParsedJob {
  return {
    roleTitle: input.roleTitle,
    company: '',
    country: input.country,
    location: '',
    salary: input.salary ?? null,
    requiredSkills: input.requiredSkills ?? [],
    niceToHaveSkills: [],
    tools: [],
    domainKeywords: input.domainKeywords ?? [],
    responsibilities: input.responsibilities ?? [],
    sponsorshipSignals: [],
    redFlags: [],
    senioritySignals: [],
    workPattern: null,
    rawText: input.rawText ?? `${input.roleTitle}`,
  }
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  let body: SponsorshipCheckRequest
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (!body?.parsed || typeof body.parsed !== 'object') {
    return NextResponse.json({ error: 'Missing "parsed" job details' }, { status: 400 })
  }

  const missing = REQUIRED_STRING_FIELDS.filter(
    (field) => typeof body.parsed[field] !== 'string' || !body.parsed[field].trim(),
  )
  if (missing.length > 0) {
    return NextResponse.json({ error: `Missing required field(s): ${missing.join(', ')}` }, { status: 400 })
  }

  const assessment = assessSponsorshipReadiness(toParsedJob(body.parsed), body.mobility ?? {})
  return NextResponse.json({ data: assessment, error: null })
}
