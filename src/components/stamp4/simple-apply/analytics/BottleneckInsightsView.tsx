import { computeFunnelInsights, type SegmentInsight } from '@/lib/stamp4/simple-apply/analytics/funnelInsights'
import type { TrackedJob } from '@/lib/stamp4/simple-apply/types'
import { AnalyticsEmptyState, MIN_JOBS_FOR_ANALYTICS } from './AnalyticsEmptyState'

function SegmentTable({ title, rows }: { title: string; rows: SegmentInsight[] }) {
  return (
    <article className="card stack">
      <h3>{title}</h3>
      <div className="table-wrap"><table><thead><tr><th>Segment</th><th>Tracked</th><th>Applied</th><th>Application rate</th><th>Response rate</th><th>Interview rate</th></tr></thead>
        <tbody>{rows.map((row) => <tr key={row.label}><td><strong>{row.label}</strong></td><td>{row.tracked}</td><td>{row.applied}</td><td>{row.applicationRate}%</td><td>{row.responseRate}%</td><td>{row.interviewRate}%</td></tr>)}</tbody>
      </table></div>
      <p className="muted">Response and interview rates use submitted applications as the denominator, so countries and sponsorship signals remain comparable.</p>
    </article>
  )
}

export function BottleneckInsightsView({ jobs }: { jobs: TrackedJob[] }) {
  if (jobs.length < MIN_JOBS_FOR_ANALYTICS) return <AnalyticsEmptyState jobCount={jobs.length} />
  const insights = computeFunnelInsights(jobs)

  return <div className="stack">
    <div className="grid summary-grid">
      <article className="card stack"><p className="eyebrow">Application rate</p><p className="metric">{insights.overall.applicationRate}%</p><p className="muted">{insights.overall.applied} of {insights.overall.tracked}</p></article>
      <article className="card stack"><p className="eyebrow">Employer response</p><p className="metric">{insights.overall.responseRate}%</p><p className="muted">After application</p></article>
      <article className="card stack"><p className="eyebrow">Interview conversion</p><p className="metric">{insights.overall.interviewRate}%</p><p className="muted">From applications</p></article>
      <article className="card stack"><p className="eyebrow">Overdue follow-ups</p><p className="metric">{insights.overdue}</p><p className="muted">{insights.replied} outreach replies recorded</p></article>
    </div>

    <article className="card stack"><div><p className="eyebrow">Action engine</p><h3>What is blocking the next interview?</h3></div>
      {insights.recommendations.map((item) => <div className={`notice ${item.severity === 'High' ? 'error' : ''}`} key={item.title}>
        <strong>{item.severity}: {item.title}</strong><p>{item.evidence}</p><p><strong>Next move:</strong> {item.action}</p>
      </div>)}
    </article>
    <SegmentTable title="Conversion by target country" rows={insights.countries} />
    <SegmentTable title="Conversion by sponsorship signal" rows={insights.sponsorship} />
  </div>
}