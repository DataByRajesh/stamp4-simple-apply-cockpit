import type { NextRequest } from 'next/server'
import { matchesTargetRoles } from '@/lib/stamp4/simple-apply/atsFeeds'
import type { CareerMobilityProfile } from '@/lib/stamp4/simple-apply/profile'
import { buildSkipReason } from '@/lib/stamp4/simple-apply/skipReason'
import { isEmailWorthyMatch, scorePosting } from '@/lib/stamp4/simple-apply/sponsorMatchScoring'
import { authenticateRequest } from '@/lib/stamp4/simple-apply/supabaseAuth'
import type { SeenSponsorPosting } from '@/lib/stamp4/simple-apply/types'

type SeenPostingRow = {
  company_name: string
  external_id: string
  title: string
  url: string
  location: string | null
  score_total: number | null
  decision: string | null
  description_text: string | null
  first_seen_at: string
  verified_sponsor: boolean | null
}

function postingExplanation(row: SeenPostingRow, profile: CareerMobilityProfile): string {
  if (isEmailWorthyMatch(row.decision ?? '', row.title, profile.targetRoleLane)) {
    return 'Target-lane match; email-worthy when first seen.'
  }

  if (!matchesTargetRoles(row.title, profile.targetRoleLane)) {
    return 'Not emailed: title does not match your target role lane.'
  }

  if (row.decision === 'Skip') {
    if (!row.description_text) return 'Not emailed: stored decision is Skip, but no JD text was captured for details.'

    const { parsed, score } = scorePosting(row.company_name, row.title, row.location, row.description_text, profile)
    const reason = buildSkipReason(score, parsed, profile)
    return `Not emailed: ${reason.details.join(' ')}`
  }

  return 'Target-lane match; email-worthy when first seen.'
}

function rowToPosting(row: SeenPostingRow, profile: CareerMobilityProfile): SeenSponsorPosting {
  return {
    companyName: row.company_name,
    externalId: row.external_id,
    title: row.title,
    url: row.url,
    location: row.location,
    scoreTotal: row.score_total,
    decision: row.decision,
    descriptionText: row.description_text,
    firstSeenAt: row.first_seen_at,
    verifiedSponsor: row.verified_sponsor,
    explanation: postingExplanation(row, profile),
  }
}

export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request)
  if (auth instanceof Response) return auth

  const [postingsResult, profileResult] = await Promise.all([
    auth.supabase
      .from('seen_job_postings')
      .select(
        'company_name, external_id, title, url, location, score_total, decision, description_text, first_seen_at, verified_sponsor',
      )
      .order('first_seen_at', { ascending: false })
      .limit(50),
    auth.supabase.from('career_search_profiles').select('profile').eq('user_id', auth.user.id).maybeSingle(),
  ])

  if (postingsResult.error) return auth.json({ error: postingsResult.error.message }, { status: 500 })
  if (profileResult.error) return auth.json({ error: profileResult.error.message }, { status: 500 })
  if (!profileResult.data) {
    return auth.json({ error: 'Set up your career search profile before viewing seen postings.' }, { status: 400 })
  }

  const profile = profileResult.data.profile as CareerMobilityProfile
  const rows = postingsResult.data as SeenPostingRow[]
  return auth.json(rows.map((row) => rowToPosting(row, profile)))
}
