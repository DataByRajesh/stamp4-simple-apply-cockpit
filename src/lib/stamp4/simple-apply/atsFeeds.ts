import type { AtsProvider } from './sponsorCompanies'

export interface NormalizedJobPosting {
  externalId: string
  title: string
  url: string
  location: string | null
  descriptionText: string
}

// Shape for feeds that aggregate across many employers (Arbeitnow, Adzuna) rather than a single
// known watchlist company, so the company name has to travel with each posting.
export interface AggregatorJobPosting extends NormalizedJobPosting {
  companyName: string
}

interface GreenhouseJob {
  id: number | string
  title: string
  absolute_url: string
  location?: { name?: string } | null
  content?: string | null
}

interface LeverJob {
  id: string
  text: string
  hostedUrl: string
  categories?: { location?: string } | null
  descriptionPlain?: string | null
  description?: string | null
}

interface AshbyJob {
  id?: string
  title: string
  jobUrl: string
  location?: string | null
  descriptionPlain?: string | null
  descriptionHtml?: string | null
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
}

export function stripHtml(html: string): string {
  // Some ATS boards (observed on Greenhouse) return the content field HTML-entity-encoded
  // (literal "&lt;p&gt;" instead of "<p>"), so entities must be decoded before tags can be
  // stripped - decoding first is also safe for plain HTML with inline entities like "&amp;".
  const tagsRevealed = decodeHtmlEntities(html)
  const tagsStripped = tagsRevealed.replace(/<[^>]+>/g, ' ')
  // Decode again: entities that survive the first pass (e.g. "&amp;" meaning a literal "&" in
  // the visible text, as opposed to the tag-hiding entities the first pass exists to reveal).
  return decodeHtmlEntities(tagsStripped).replace(/\s+/g, ' ').trim()
}

async function fetchGreenhouseJobs(slug: string): Promise<NormalizedJobPosting[]> {
  const response = await fetch(`https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(slug)}/jobs?content=true`)
  if (!response.ok) throw new Error(`Greenhouse feed failed for ${slug}: ${response.status}`)

  const data = (await response.json()) as { jobs?: GreenhouseJob[] }
  return (data.jobs ?? []).map((job) => ({
    externalId: String(job.id),
    title: job.title,
    url: job.absolute_url,
    location: job.location?.name ?? null,
    descriptionText: job.content ? stripHtml(job.content) : '',
  }))
}

async function fetchLeverJobs(slug: string): Promise<NormalizedJobPosting[]> {
  const response = await fetch(`https://api.lever.co/v0/postings/${encodeURIComponent(slug)}?mode=json`)
  if (!response.ok) throw new Error(`Lever feed failed for ${slug}: ${response.status}`)

  const data = (await response.json()) as LeverJob[]
  return data.map((job) => ({
    externalId: job.id,
    title: job.text,
    url: job.hostedUrl,
    location: job.categories?.location ?? null,
    descriptionText: job.descriptionPlain || (job.description ? stripHtml(job.description) : ''),
  }))
}

async function fetchAshbyJobs(slug: string): Promise<NormalizedJobPosting[]> {
  const response = await fetch(`https://api.ashbyhq.com/posting-api/job-board/${encodeURIComponent(slug)}`)
  if (!response.ok) throw new Error(`Ashby feed failed for ${slug}: ${response.status}`)

  const data = (await response.json()) as { jobs?: AshbyJob[] }
  return (data.jobs ?? []).map((job) => ({
    externalId: job.id ?? job.jobUrl,
    title: job.title,
    url: job.jobUrl,
    location: job.location ?? null,
    descriptionText: job.descriptionPlain || (job.descriptionHtml ? stripHtml(job.descriptionHtml) : ''),
  }))
}

export async function fetchAtsJobs(provider: AtsProvider, slug: string): Promise<NormalizedJobPosting[]> {
  switch (provider) {
    case 'greenhouse':
      return fetchGreenhouseJobs(slug)
    case 'lever':
      return fetchLeverJobs(slug)
    case 'ashby':
      return fetchAshbyJobs(slug)
  }
}

export function matchesTargetRoles(title: string, targetRoleLane: readonly string[]): boolean {
  const normalised = title.toLowerCase()
  return targetRoleLane.some((role) => normalised.includes(role))
}
