import type { ScoreBreakdown, TrackedJob } from './types'

export interface DashboardStats {
  totalTracked: number
  averageScore: number | null
  applicationRate: number | null
  weakestDimension: { label: string; timesWeakest: number } | null
  countrySplit: { country: string; count: number; percentage: number }[]
}

const APPLIED_STATUSES: TrackedJob['status'][] = ['Applied', 'Follow-up', 'Interview']

const DIMENSIONS: Array<[keyof Omit<ScoreBreakdown, 'total' | 'decision'>, string]> = [
  ['roleFit', 'Role fit'],
  ['domainFit', 'Domain fit'],
  ['skillFit', 'Skill fit'],
  ['permitFit', 'Permit fit'],
  ['proofStrength', 'Proof strength'],
  ['seniorityFit', 'Seniority fit'],
]

function round(value: number): number {
  return Math.round(value * 10) / 10
}

function computeWeakestDimension(jobs: TrackedJob[]): DashboardStats['weakestDimension'] {
  const jobsWithBreakdown = jobs.filter((job): job is TrackedJob & { scoreBreakdown: ScoreBreakdown } =>
    Boolean(job.scoreBreakdown),
  )

  if (jobsWithBreakdown.length === 0) return null

  const tally = new Map<string, number>(DIMENSIONS.map(([, label]) => [label, 0]))

  for (const job of jobsWithBreakdown) {
    const breakdown = job.scoreBreakdown
    let weakestLabel = DIMENSIONS[0][1]
    let weakestValue = breakdown[DIMENSIONS[0][0]]

    for (const [key, label] of DIMENSIONS) {
      if (breakdown[key] < weakestValue) {
        weakestValue = breakdown[key]
        weakestLabel = label
      }
    }

    tally.set(weakestLabel, (tally.get(weakestLabel) ?? 0) + 1)
  }

  let topLabel = DIMENSIONS[0][1]
  let topCount = tally.get(topLabel) ?? 0

  for (const [label, count] of tally) {
    if (count > topCount) {
      topCount = count
      topLabel = label
    }
  }

  return { label: topLabel, timesWeakest: topCount }
}

function computeCountrySplit(jobs: TrackedJob[]): DashboardStats['countrySplit'] {
  const counts = new Map<string, number>()

  for (const job of jobs) {
    const country = job.country || 'Unknown'
    counts.set(country, (counts.get(country) ?? 0) + 1)
  }

  return Array.from(counts.entries())
    .map(([country, count]) => ({ country, count, percentage: round((count / jobs.length) * 100) }))
    .sort((a, b) => b.count - a.count)
}

export function computeDashboardStats(jobs: TrackedJob[]): DashboardStats {
  if (jobs.length === 0) {
    return {
      totalTracked: 0,
      averageScore: null,
      applicationRate: null,
      weakestDimension: null,
      countrySplit: [],
    }
  }

  const averageScore = round(jobs.reduce((sum, job) => sum + job.score, 0) / jobs.length)
  const appliedCount = jobs.filter((job) => APPLIED_STATUSES.includes(job.status)).length
  const applicationRate = round((appliedCount / jobs.length) * 100)

  return {
    totalTracked: jobs.length,
    averageScore,
    applicationRate,
    weakestDimension: computeWeakestDimension(jobs),
    countrySplit: computeCountrySplit(jobs),
  }
}
