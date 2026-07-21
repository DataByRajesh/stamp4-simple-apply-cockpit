import { computeDashboardStats } from '@/lib/stamp4/simple-apply/dashboardStats'
import { computePeriodComparison } from '@/lib/stamp4/simple-apply/analytics/timeSeriesStats'
import { computeWeeklyApplicationPace } from '@/lib/stamp4/simple-apply/analytics/weeklyApplicationPace'
import type { TrackedJob } from '@/lib/stamp4/simple-apply/types'
import { AnalyticsEmptyState, MIN_JOBS_FOR_ANALYTICS } from './AnalyticsEmptyState'

const GOOD_FIT_DECISIONS: TrackedJob['decision'][] = ['Apply Now', 'Apply with Proof Fix']
const APPLIED_STATUSES: TrackedJob['status'][] = ['Applied', 'Follow-up', 'Interview', 'Rejected']

export function AnalyticsOverview({ jobs }: { jobs: TrackedJob[] }) {
  const pace = computeWeeklyApplicationPace(jobs)

  const paceWidget = (
    <article className={`card stack ${pace.onTrack ? 'notice success' : 'notice info'}`}>
      <p className="eyebrow">Weekly application pace</p>
      <p className="metric">
        {pace.thisWeek.count} / {pace.targetPerWeek}
      </p>
      <p className="muted">
        {pace.onTrack
          ? 'On track for this week - keep the pace up.'
          : `${pace.targetPerWeek - pace.thisWeek.count} more application${pace.targetPerWeek - pace.thisWeek.count === 1 ? '' : 's'} to hit this week's target.`}
      </p>
      <div className="toolbar">
        {pace.recentWeeks.map((week) => (
          <span key={week.weekLabel} className="muted" title={week.weekLabel}>
            {week.count}
          </span>
        ))}
      </div>
      <p className="muted">{pace.totalApplied} total applications tracked. Volume matters more than tool tweaks at this stage.</p>
    </article>
  )

  if (jobs.length < MIN_JOBS_FOR_ANALYTICS) {
    return (
      <div className="stack">
        {paceWidget}
        <AnalyticsEmptyState jobCount={jobs.length} />
      </div>
    )
  }

  const stats = computeDashboardStats(jobs)
  const period = computePeriodComparison(jobs, 7)
  const goodFitCount = jobs.filter((job) => GOOD_FIT_DECISIONS.includes(job.decision)).length
  const appliedCount = jobs.filter((job) => APPLIED_STATUSES.includes(job.status)).length
  const interviewCount = jobs.filter((job) => job.status === 'Interview').length

  return (
    <div className="stack">
      {paceWidget}

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
