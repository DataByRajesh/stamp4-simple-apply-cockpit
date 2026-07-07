'use client'

import type { TrackedJob } from '@/lib/stamp4/simple-apply/types'
import { AnalyticsEmptyState, MIN_JOBS_FOR_ANALYTICS } from './AnalyticsEmptyState'

const GOOD_FIT_DECISIONS: TrackedJob['decision'][] = ['Apply Now', 'Apply with Proof Fix']
const APPLIED_STATUSES: TrackedJob['status'][] = ['Applied', 'Follow-up', 'Interview', 'Rejected']
const FOLLOW_UP_STATUSES: TrackedJob['status'][] = ['Follow-up', 'Interview']

function percent(part: number, whole: number): string {
  if (whole === 0) return '-'
  return `${Math.round((part / whole) * 100)}%`
}

export function ConversionFunnelView({ jobs }: { jobs: TrackedJob[] }) {
  if (jobs.length < MIN_JOBS_FOR_ANALYTICS) return <AnalyticsEmptyState jobCount={jobs.length} />

  const analysed = jobs.length
  const goodFit = jobs.filter((job) => GOOD_FIT_DECISIONS.includes(job.decision)).length
  const applied = jobs.filter((job) => APPLIED_STATUSES.includes(job.status)).length
  const followUp = jobs.filter((job) => FOLLOW_UP_STATUSES.includes(job.status)).length
  const interview = jobs.filter((job) => job.status === 'Interview').length

  const stages = [
    { label: 'Analysed', count: analysed, rate: percent(analysed, analysed) },
    { label: 'Good fit (Apply Now / Proof Fix)', count: goodFit, rate: percent(goodFit, analysed) },
    { label: 'Applied', count: applied, rate: percent(applied, goodFit) },
    { label: 'Follow-up', count: followUp, rate: percent(followUp, applied) },
    { label: 'Interview', count: interview, rate: percent(interview, followUp) },
  ]

  return (
    <article className="card stack">
      <h3>Conversion funnel</h3>
      <p className="muted">
        The most useful view for spotting where the sprint is actually stalling - plenty of good-fit jobs found but
        low follow-through is a behavioural gap, not a search-quality one.
      </p>
      <div className="stack compact-stack">
        {stages.map((stage, index) => (
          <div className="score-row" key={stage.label}>
            <div className="score-row-head">
              <span className="score-row-label">{stage.label}</span>
              <span className="score-pill score-pill-high">
                {stage.count}
                {index > 0 && <span className="score-pill-max"> ({stage.rate})</span>}
              </span>
            </div>
            <div className="meter">
              <div
                className="meter-fill"
                data-tier="high"
                style={{ width: `${analysed ? (stage.count / analysed) * 100 : 0}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </article>
  )
}
