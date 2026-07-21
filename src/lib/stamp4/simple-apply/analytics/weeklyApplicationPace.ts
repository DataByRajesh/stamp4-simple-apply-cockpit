import type { TrackedJob } from '../types'
import { getISOWeek } from './timeSeriesStats'

export interface WeeklyApplicationPace {
  weekLabel: string
  count: number
}

export interface ApplicationPaceSummary {
  targetPerWeek: number
  thisWeek: WeeklyApplicationPace
  onTrack: boolean
  recentWeeks: WeeklyApplicationPace[]
  totalApplied: number
}

const APPLIED_STATUSES: TrackedJob['status'][] = ['Applied', 'Follow-up', 'Recruiter Screen', 'Interview', 'Final Stage', 'Offer', 'Rejected']

const DAY_MS = 24 * 60 * 60 * 1000

function isValidDate(value: string | undefined | null): value is string {
  if (!value) return false
  return !Number.isNaN(new Date(value).getTime())
}

/**
 * Best-available date a job was actually applied to, not just tracked/analysed.
 * Prefers the explicit submitted date, falls back to the last update, then to
 * when it was first added (least accurate, but better than dropping the job).
 */
export function resolveAppliedDate(job: TrackedJob): string | null {
  if (isValidDate(job.applicationRecord?.submittedAt)) return job.applicationRecord!.submittedAt
  if (isValidDate(job.updatedAt)) return job.updatedAt!
  if (isValidDate(job.dateAdded)) return job.dateAdded
  return null
}

function appliedJobDates(jobs: TrackedJob[]): string[] {
  return jobs
    .filter((job) => APPLIED_STATUSES.includes(job.status))
    .map((job) => resolveAppliedDate(job))
    .filter((date): date is string => date !== null)
}

export function computeWeeklyApplicationPace(jobs: TrackedJob[], targetPerWeek: number = 4, weeksOfHistory: number = 6): ApplicationPaceSummary {
  const dates = appliedJobDates(jobs)
  const byWeek = new Map<string, number>()

  for (const date of dates) {
    const week = getISOWeek(date)
    byWeek.set(week, (byWeek.get(week) ?? 0) + 1)
  }

  const currentWeekLabel = getISOWeek(new Date().toISOString())
  const thisWeekCount = byWeek.get(currentWeekLabel) ?? 0

  const recentWeeks: WeeklyApplicationPace[] = []
  for (let i = weeksOfHistory - 1; i >= 0; i -= 1) {
    const weekDate = new Date(Date.now() - i * 7 * DAY_MS)
    const weekLabel = getISOWeek(weekDate.toISOString())
    recentWeeks.push({ weekLabel, count: byWeek.get(weekLabel) ?? 0 })
  }

  return {
    targetPerWeek,
    thisWeek: { weekLabel: currentWeekLabel, count: thisWeekCount },
    onTrack: thisWeekCount >= targetPerWeek,
    recentWeeks,
    totalApplied: dates.length,
  }
}
