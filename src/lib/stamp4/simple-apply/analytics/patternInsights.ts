import { getISOWeek } from './timeSeriesStats'
import type { TrackedJob } from '../types'

/**
 * Addendum 9 (patternInsights.ts / computeSalaryTrend / computeKeywordCorrelations) did not exist
 * anywhere in this codebase when Addendum 10 was implemented - this file is a minimal, honestly-
 * scoped substitute built alongside it rather than a duplicate of something that already existed.
 * Both functions here deliberately favour restraint over false precision: small sample sizes get
 * filtered out or left to the "not enough data" gate in the calling view, rather than rendering a
 * confident-looking chart or ranking off 2-3 points.
 */

export interface SalaryTrendPoint {
  weekLabel: string
  jobsWithSalary: number
  avgSalaryEUR: number
}

function extractSalaryNumber(salary: string | null): number | null {
  if (!salary) return null

  // Longer bare-digit branch must come first: regex alternation tries branches left-to-right, so
  // trying the comma-grouped branch first would split an unformatted "40000" into "400" + "00".
  const matches = Array.from(salary.matchAll(/(\d{4,6}|\d{2,3}(?:,\d{3})?)\s*(k)?/gi))
  const amounts = matches
    .map((match) => {
      const value = Number(match[1].replace(/,/g, ''))
      if (Number.isNaN(value)) return null
      return match[2] || value < 1000 ? value * 1000 : value
    })
    .filter((value): value is number => value !== null)

  return amounts.length ? Math.min(...amounts) : null
}

export function computeSalaryTrend(jobs: TrackedJob[]): SalaryTrendPoint[] {
  const byWeek = new Map<string, number[]>()

  for (const job of jobs) {
    const salary = extractSalaryNumber(job.salary)
    if (salary === null) continue

    const week = getISOWeek(job.dateAdded)
    const list = byWeek.get(week) ?? []
    list.push(salary)
    byWeek.set(week, list)
  }

  return Array.from(byWeek.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([weekLabel, salaries]) => ({
      weekLabel,
      jobsWithSalary: salaries.length,
      avgSalaryEUR: Math.round(salaries.reduce((a, b) => a + b, 0) / salaries.length),
    }))
}

export interface KeywordSignal {
  keyword: string
  jobCount: number
  avgScore: number
}

const MIN_JOBS_FOR_SIGNAL = 2

export function computeKeywordCorrelations(jobs: TrackedJob[]): KeywordSignal[] {
  const byKeyword = new Map<string, number[]>()

  for (const job of jobs) {
    if (!job.parsedJob) continue

    const keywords = new Set([...job.parsedJob.domainKeywords, ...job.parsedJob.requiredSkills])
    for (const keyword of keywords) {
      const list = byKeyword.get(keyword) ?? []
      list.push(job.score)
      byKeyword.set(keyword, list)
    }
  }

  return Array.from(byKeyword.entries())
    .filter(([, scores]) => scores.length >= MIN_JOBS_FOR_SIGNAL)
    .map(([keyword, scores]) => ({
      keyword,
      jobCount: scores.length,
      avgScore: Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10,
    }))
    .sort((a, b) => b.avgScore - a.avgScore)
}
