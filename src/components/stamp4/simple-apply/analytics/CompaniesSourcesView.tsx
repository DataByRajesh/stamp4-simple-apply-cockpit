'use client'

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { computeCompanyStats, computeSponsorFeedCompanyStats } from '@/lib/stamp4/simple-apply/analytics/companyStats'
import { computeDashboardStats } from '@/lib/stamp4/simple-apply/dashboardStats'
import type { SeenSponsorPosting, TrackedJob } from '@/lib/stamp4/simple-apply/types'
import { AnalyticsEmptyState, MIN_JOBS_FOR_ANALYTICS } from './AnalyticsEmptyState'

export function CompaniesSourcesView({
  jobs,
  sponsorPostings,
}: {
  jobs: TrackedJob[]
  sponsorPostings: SeenSponsorPosting[]
}) {
  if (jobs.length < MIN_JOBS_FOR_ANALYTICS) return <AnalyticsEmptyState jobCount={jobs.length} />

  const companyStats = computeCompanyStats(jobs)
  const sponsorFeedStats = computeSponsorFeedCompanyStats(sponsorPostings)
  const countrySplit = computeDashboardStats(jobs).countrySplit

  return (
    <div className="stack">
      <article className="card stack">
        <h3>Tracked jobs by company</h3>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Company</th>
                <th>Jobs</th>
                <th>Avg score</th>
                <th>Best decision</th>
              </tr>
            </thead>
            <tbody>
              {companyStats.map((stat) => (
                <tr key={stat.company}>
                  <td>{stat.company}</td>
                  <td>{stat.jobCount}</td>
                  <td>{stat.avgScore}/5</td>
                  <td>{stat.bestDecision}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>

      <article className="card stack">
        <h3>Sponsor feed: average pre-scored fit by company</h3>
        {sponsorFeedStats.length === 0 ? (
          <p className="muted">No sponsor-poller data yet - check the Sponsor Companies tab.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Company</th>
                  <th>Postings seen</th>
                  <th>Avg score</th>
                </tr>
              </thead>
              <tbody>
                {sponsorFeedStats.map((stat) => (
                  <tr key={stat.company}>
                    <td>{stat.company}</td>
                    <td>{stat.postingCount}</td>
                    <td>{stat.avgScore}/5</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </article>

      <article className="card stack">
        <h3>Jobs by country</h3>
        <p className="muted">Sanity check against the intended Ireland/Netherlands split.</p>
        <div style={{ height: 220 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={countrySplit} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="country" tick={{ fontSize: 11 }} />
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
