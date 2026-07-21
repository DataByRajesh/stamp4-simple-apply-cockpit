import { stripHtml, type AggregatorJobPosting } from './atsFeeds'

interface AdzunaJob {
  id: string
  title: string
  company?: { display_name?: string } | null
  location?: { display_name?: string } | null
  description?: string | null
  redirect_url: string
}

interface AdzunaResponse {
  results: AdzunaJob[]
}

export type AdzunaCountry = 'nl'

// Adzuna does not cover Ireland at all (confirmed against their supported-country list), so this
// is scoped to Netherlands only - Germany already has better coverage via the Arbeitnow
// visa_sponsorship=true feed, which Adzuna has no equivalent filter for.
const ADZUNA_RESULTS_PER_PAGE = 50

export async function fetchAdzunaJobs(country: AdzunaCountry, query: string): Promise<AggregatorJobPosting[]> {
  const appId = process.env.ADZUNA_APP_ID
  const appKey = process.env.ADZUNA_APP_KEY

  if (!appId || !appKey) {
    throw new Error('Adzuna is not configured. Set ADZUNA_APP_ID and ADZUNA_APP_KEY.')
  }

  const params = new URLSearchParams({
    app_id: appId,
    app_key: appKey,
    what: query,
    sort_by: 'date',
    'content-type': 'application/json',
    results_per_page: String(ADZUNA_RESULTS_PER_PAGE),
  })

  const response = await fetch(`https://api.adzuna.com/v1/api/jobs/${country}/search/1?${params.toString()}`)
  if (!response.ok) throw new Error(`Adzuna feed failed for ${country}: ${response.status}`)

  const data = (await response.json()) as AdzunaResponse

  return (data.results ?? []).map((job) => ({
    externalId: job.id,
    companyName: job.company?.display_name ?? 'Unknown company',
    title: job.title,
    url: job.redirect_url,
    location: job.location?.display_name ?? null,
    // Adzuna's description field is a short truncated snippet, not the full JD - proof/skill
    // matching against it will be more conservative than the full-text Greenhouse/Lever/Ashby
    // and Arbeitnow feeds, same limitation any generic job-aggregator listing has.
    descriptionText: job.description ? stripHtml(job.description) : '',
  }))
}
