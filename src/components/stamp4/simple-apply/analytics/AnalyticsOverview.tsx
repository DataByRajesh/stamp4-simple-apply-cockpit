import { computeDashboardStats } from '@/lib/stamp4/simple-apply/dashboardStats'
import { computePeriodComparison } from '@/lib/stamp4/simple-apply/analytics/timeSeriesStats'
import type { TrackedJob } from '@/lib/stamp4/simple-apply/types'
import { AnalyticsEmptyState, MIN_JOBS_FOR_ANALYTICS } from './AnalyticsEmptyState'

const GOOD_FIT_DECISIONS: TrackedJob['decision'][] = ['Apply Now', 'Apply with Proof Fix']
const APPLIED_STATUSES: TrackedJob['status'][] = ['Applied', 'Follow-up', 'Interview', 'Rejected']

export function AnalyticsOverview({ jobs }: { jobs: TrackedJob[] }) {
  if (jobs.length < MIN_JOBS_FOR_ANALYTICS) return <AnalyticsEmptyState jobCount={jobs.length} />

  const stats = computeDashboardStats(jobs)
  const period = computePeriodComparison(jobs, 7)
  const goodFitCount = jobs.filter((job) => GOOD_FIT_DECISIONS.includes(job.decision)).length
  const appliedCount = jobs.filter((job) => APPLIED_STATUSES.includes(job.status)).length
  const interviewCount = jobs.filter((job) => job.status === 'Interview').length

  return (
    <div className="stack">
      <div className="grid summary-grid">
        <article className="card stack">
          <p className="eyebrow">Total analysed</p>
          <p className="metric">{stats.totalTracked}</p>
        </article>
        <article className="card stack">
          <p className="eyebrow">This week</p>
          <p className="metric">{period.current}</p>
          <p className="muted">
            {period.changePercent >= 0 ? '+' : ''}
            {period.changePercent}% vs previous 7 days
          </p>
        </article>
        <article className="card stack">
          <p className="eyebrow">Average score</p>
          <p className="metric">{stats.averageScore ?? '-'}/5</p>
        </article>
        <article className="card stack">
          <p className="eyebrow">Application rate</p>
          <p className="metric">{stats.applicationRate ?? 0}%</p>
        </article>
      </div>

      <article className="card stack">
        <h3>Quick funnel snapshot</h3>
        <p className="muted">
          Analysed ({jobs.length}) &rarr; Good fit ({goodFitCount}) &rarr; Applied ({appliedCount}) &rarr; Interview (
          {interviewCount})
        </p>
      </article>
    </div>
  )
}
