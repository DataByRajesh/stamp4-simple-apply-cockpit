'use client'

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { computeWeeklyTrend, type WeeklyPoint } from '@/lib/stamp4/simple-apply/analytics/timeSeriesStats'
import { computeSalaryTrend, type SalaryTrendPoint } from '@/lib/stamp4/simple-apply/analytics/patternInsights'
import type { TrackedJob } from '@/lib/stamp4/simple-apply/types'
import { AnalyticsEmptyState, MIN_JOBS_FOR_ANALYTICS } from './AnalyticsEmptyState'

function WeeklyLineChart({
  data,
  dataKey,
  color,
}: {
  data: (WeeklyPoint | SalaryTrendPoint)[]
  dataKey: string
  color: string
}) {
  return (
    <div style={{ height: 220 }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="weekLabel" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip />
          <Line type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2} dot={{ r: 3 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

export function TrendsChart({ jobs }: { jobs: TrackedJob[] }) {
  if (jobs.length < MIN_JOBS_FOR_ANALYTICS) return <AnalyticsEmptyState jobCount={jobs.length} />

  const weekly = computeWeeklyTrend(jobs)
  const salaryTrend = computeSalaryTrend(jobs)

  return (
    <div className="stack">
      <article className="card stack">
        <h3>Jobs analysed per week</h3>
        <WeeklyLineChart data={weekly} dataKey="jobsAnalysed" color="#2563eb" />
      </article>

      <article className="card stack">
        <h3>Average score per week</h3>
        <p className="muted">Are you finding better-fit jobs over time, or is quality flat/declining?</p>
        <WeeklyLineChart data={weekly} dataKey="avgScore" color="#16a34a" />
      </article>

      <article className="card stack">
        <h3>Salary trend</h3>
        {salaryTrend.length === 0 ? (
          <p className="muted">No JDs with a parseable salary yet.</p>
        ) : (
          <WeeklyLineChart data={salaryTrend} dataKey="avgSalaryEUR" color="#d97706" />
        )}
      </article>
    </div>
  )
}
