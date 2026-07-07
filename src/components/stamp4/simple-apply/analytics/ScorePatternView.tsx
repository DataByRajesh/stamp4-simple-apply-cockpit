'use client'

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { computeDashboardStats } from '@/lib/stamp4/simple-apply/dashboardStats'
import type { ScoreBreakdown, TrackedJob } from '@/lib/stamp4/simple-apply/types'
import { AnalyticsEmptyState, MIN_JOBS_FOR_ANALYTICS } from './AnalyticsEmptyState'

const DECISIONS: ScoreBreakdown['decision'][] = ['Apply Now', 'Apply with Proof Fix', 'Save / Low Priority', 'Skip']

export function ScorePatternView({ jobs }: { jobs: TrackedJob[] }) {
  if (jobs.length < MIN_JOBS_FOR_ANALYTICS) return <AnalyticsEmptyState jobCount={jobs.length} />

  const stats = computeDashboardStats(jobs)
  const decisionBands = DECISIONS.map((decision) => ({
    decision,
    count: jobs.filter((job) => job.decision === decision).length,
  }))

  return (
    <div className="stack">
      <article className="card stack">
        <h3>Most common score drag</h3>
        {stats.weakestDimension ? (
          <p>
            <strong>{stats.weakestDimension.label}</strong> was the lowest-scoring dimension on{' '}
            {stats.weakestDimension.timesWeakest} of {jobs.length} tracked jobs - the single most common thing
            holding your fit score back.
          </p>
        ) : (
          <p className="muted">No jobs with a full score breakdown yet.</p>
        )}
      </article>

      <article className="card stack">
        <h3>Decision-band distribution</h3>
        <p className="muted">
          Most jobs clustering toward Apply Now means a well-targeted search; a spread toward Skip suggests
          scattershot sourcing.
        </p>
        <div style={{ height: 240 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={decisionBands} margin={{ top: 8, right: 16, left: 0, bottom: 24 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="decision" tick={{ fontSize: 10 }} angle={-15} textAnchor="end" interval={0} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" fill="#2563eb" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </article>
    </div>
  )
}
