import { stripHtml, type AggregatorJobPosting } from './atsFeeds'

interface JoobleJob {
  // Jooble's numeric id is a full 64-bit integer (e.g. -6044188449424794720), which exceeds
  // JavaScript's safe integer range (2^53) - JSON.parse would silently round it. `link` is
  // already a unique per-posting string, so it's used as the dedup key instead of `id`.
  id: number
  title: string
  location?: string | null
  snippet?: string | null
  link: string
  company?: string | null
}

interface JoobleResponse {
  jobs: JoobleJob[]
  totalCount: number
}

// Confirmed live: Jooble is the only aggregator that covers Ireland at all (Adzuna does not
// support Ireland; Arbeitnow is Germany/Austria/Switzerland only). No documented sort-by-date
// param, unlike Adzuna - daily re-polling relies on seen_job_postings' own dedup (onConflict on
// company_name,external_id) to skip already-seen results rather than a freshness sort.
export async function fetchJoobleJobs(location: string, keywords: string): Promise<AggregatorJobPosting[]> {
  const apiKey = process.env.JOOBLE_API_KEY

  if (!apiKey) {
    throw new Error('Jooble is not configured. Set JOOBLE_API_KEY.')
  }

  const response = await fetch(`https://jooble.org/api/${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ keywords, location, page: '1' }),
  })

  if (!response.ok) throw new Error(`Jooble feed failed: ${response.status}`)

  const data = (await response.json()) as JoobleResponse

  return (data.jobs ?? []).map((job) => ({
    externalId: job.link,
    companyName: job.company || 'Unknown company',
    title: job.title,
    url: job.link,
    location: job.location ?? null,
    descriptionText: job.snippet ? stripHtml(job.snippet) : '',
  }))
}
