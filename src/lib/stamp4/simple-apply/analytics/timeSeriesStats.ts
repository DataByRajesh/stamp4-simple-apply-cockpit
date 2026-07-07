import type { TrackedJob } from '../types'

export interface WeeklyPoint {
  weekLabel: string
  jobsAnalysed: number
  avgScore: number
}

export interface PeriodComparison {
  current: number
  previous: number
  changePercent: number
}

export function getISOWeek(dateStr: string): string {
  const date = new Date(dateStr)
  const year = date.getFullYear()
  const firstJan = new Date(year, 0, 1)
  const days = Math.floor((date.getTime() - firstJan.getTime()) / 86400000)
  const week = Math.ceil((days + firstJan.getDay() + 1) / 7)
  return `${year}-W${String(week).padStart(2, '0')}`
}

export function computeWeeklyTrend(jobs: TrackedJob[]): WeeklyPoint[] {
  const byWeek = new Map<string, number[]>()

  for (const job of jobs) {
    const week = getISOWeek(job.dateAdded)
    const list = byWeek.get(week) ?? []
    list.push(job.score)
    byWeek.set(week, list)
  }

  return Array.from(byWeek.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([weekLabel, scores]) => ({
      weekLabel,
      jobsAnalysed: scores.length,
      avgScore: Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10,
    }))
}

export function computePeriodComparison(jobs: TrackedJob[], periodDays: number = 7): PeriodComparison {
  const now = Date.now()
  const periodMs = periodDays * 24 * 60 * 60 * 1000

  const currentPeriod = jobs.filter((job) => now - new Date(job.dateAdded).getTime() < periodMs)
  const previousPeriod = jobs.filter((job) => {
    const age = now - new Date(job.dateAdded).getTime()
    return age >= periodMs && age < periodMs * 2
  })

  const current = currentPeriod.length
  const previous = previousPeriod.length
  const changePercent = previous > 0 ? Math.round(((current - previous) / previous) * 100) : current > 0 ? 100 : 0

  return { current, previous, changePercent }
}
