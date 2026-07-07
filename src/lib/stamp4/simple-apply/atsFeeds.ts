import type { AtsProvider } from './sponsorCompanies'

export interface NormalizedJobPosting {
  externalId: string
  title: string
  url: string
  location: string | null
}

interface GreenhouseJob {
  id: number | string
  title: string
  absolute_url: string
  location?: { name?: string } | null
}

interface LeverJob {
  id: string
  text: string
  hostedUrl: string
  categories?: { location?: string } | null
}

interface AshbyJob {
  id?: string
  title: string
  jobUrl: string
  location?: string | null
}

async function fetchGreenhouseJobs(slug: string): Promise<NormalizedJobPosting[]> {
  const response = await fetch(`https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(slug)}/jobs`)
  if (!response.ok) throw new Error(`Greenhouse feed failed for ${slug}: ${response.status}`)

  const data = (await response.json()) as { jobs?: GreenhouseJob[] }
  return (data.jobs ?? []).map((job) => ({
    externalId: String(job.id),
    title: job.title,
    url: job.absolute_url,
    location: job.location?.name ?? null,
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
