import { checkAccessSecret, unauthorizedResponse } from '@/lib/stamp4/simple-apply/checkAccessSecret'
import { getSupabaseServer } from '@/lib/stamp4/simple-apply/supabaseServer'
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

function rowToPosting(row: SeenPostingRow): SeenSponsorPosting {
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
  }
}

export async function GET(request: Request) {
  if (!checkAccessSecret(request)) return unauthorizedResponse()

  const { data, error } = await getSupabaseServer()
    .from('seen_job_postings')
    .select(
      'company_name, external_id, title, url, location, score_total, decision, description_text, first_seen_at, verified_sponsor',
    )
    .order('first_seen_at', { ascending: false })
    .limit(50)

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json((data as SeenPostingRow[]).map(rowToPosting))
}
