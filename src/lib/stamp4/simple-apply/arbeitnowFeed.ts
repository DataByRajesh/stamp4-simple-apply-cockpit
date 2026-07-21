import { stripHtml, type AggregatorJobPosting } from './atsFeeds'

interface ArbeitnowJob {
  slug: string
  company_name: string
  title: string
  description?: string | null
  url: string
  location?: string | null
}

interface ArbeitnowResponse {
  data: ArbeitnowJob[]
  links: { next: string | null }
}

// Arbeitnow's own `search` query param does not reliably filter by keyword (verified live -
// searching "systems analyst" returned unrelated roles), so role-lane matching is left to the
// caller via matchesTargetRoles(), same as the Greenhouse/Lever/Ashby poller in atsFeeds.ts.
// `visa_sponsorship=true` is the one filter confirmed to work and is the whole point of using
// this feed - it is Arbeitnow's only documented, verified server-side filter.
const ARBEITNOW_VISA_SPONSORSHIP_URL = 'https://www.arbeitnow.com/api/job-board-api?visa_sponsorship=true'

// Safety cap on pagination - the visa_sponsorship=true filter returns a small result set in
// practice (single digits), so this should never be reached; it just guards against an
// unbounded loop if Arbeitnow's result size grows unexpectedly.
const MAX_PAGES = 5

export async function fetchArbeitnowVisaSponsorshipJobs(): Promise<AggregatorJobPosting[]> {
  const postings: AggregatorJobPosting[] = []
  let url: string | null = ARBEITNOW_VISA_SPONSORSHIP_URL

  for (let page = 0; page < MAX_PAGES && url; page += 1) {
    const response = await fetch(url)
    if (!response.ok) throw new Error(`Arbeitnow feed failed: ${response.status}`)

    const data = (await response.json()) as ArbeitnowResponse

    for (const job of data.data) {
      postings.push({
        externalId: job.slug,
        companyName: job.company_name,
        title: job.title,
        url: job.url,
        location: job.location ?? null,
        descriptionText: job.description ? stripHtml(job.description) : '',
      })
    }

    url = data.links.next
  }

  return postings
}
