import type { SeenSponsorPosting, TrackedJob } from '../types'

export interface CompanyStat {
  company: string
  jobCount: number
  avgScore: number
  bestDecision: string
}

export function computeCompanyStats(jobs: TrackedJob[]): CompanyStat[] {
  const byCompany = new Map<string, TrackedJob[]>()

  for (const job of jobs) {
    const list = byCompany.get(job.company) ?? []
    list.push(job)
    byCompany.set(job.company, list)
  }

  return Array.from(byCompany.entries())
    .map(([company, companyJobs]) => ({
      company,
      jobCount: companyJobs.length,
      avgScore: Math.round((companyJobs.reduce((sum, job) => sum + job.score, 0) / companyJobs.length) * 10) / 10,
      bestDecision: companyJobs.reduce((best, job) => (job.score > best.score ? job : best), companyJobs[0]).decision,
    }))
    .sort((a, b) => b.avgScore - a.avgScore)
}

export interface SponsorFeedCompanyStat {
  company: string
  postingCount: number
  avgScore: number
}

/**
 * Average pre-scored fit per company from the sponsor-poller feed (seen_job_postings), separate
 * from computeCompanyStats above which only covers jobs you've actually saved to the tracker.
 * Deliberately plain - "average score of postings seen", not a formal "friendliness ranking".
 */
export function computeSponsorFeedCompanyStats(postings: SeenSponsorPosting[]): SponsorFeedCompanyStat[] {
  const byCompany = new Map<string, number[]>()

  for (const posting of postings) {
    if (posting.scoreTotal === null) continue
    const list = byCompany.get(posting.companyName) ?? []
    list.push(posting.scoreTotal)
    byCompany.set(posting.companyName, list)
  }

  return Array.from(byCompany.entries())
    .map(([company, scores]) => ({
      company,
      postingCount: scores.length,
      avgScore: Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10,
    }))
    .sort((a, b) => b.avgScore - a.avgScore)
}
