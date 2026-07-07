import { computeKeywordCorrelations } from '@/lib/stamp4/simple-apply/analytics/patternInsights'
import type { TrackedJob } from '@/lib/stamp4/simple-apply/types'
import { AnalyticsEmptyState, MIN_JOBS_FOR_ANALYTICS } from './AnalyticsEmptyState'

export function KeywordSignalsTable({ jobs }: { jobs: TrackedJob[] }) {
  if (jobs.length < MIN_JOBS_FOR_ANALYTICS) return <AnalyticsEmptyState jobCount={jobs.length} />

  const signals = computeKeywordCorrelations(jobs)

  return (
    <article className="card stack">
      <h3>Keyword signals</h3>
      <p className="muted">
        Signal strength, not formal correlation - which JD keywords tend to appear alongside better or worse scores.
        Keywords appearing on only 1 job are excluded as too little evidence to read anything into.
      </p>
      {signals.length === 0 ? (
        <p className="muted">No keyword appears on 2+ jobs yet.</p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Keyword</th>
                <th>Jobs</th>
                <th>Avg score</th>
              </tr>
            </thead>
            <tbody>
              {signals.map((signal) => (
                <tr key={signal.keyword}>
                  <td>{signal.keyword}</td>
                  <td>{signal.jobCount}</td>
                  <td>{signal.avgScore}/5</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </article>
  )
}
