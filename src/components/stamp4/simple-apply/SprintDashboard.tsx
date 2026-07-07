'use client'

import { useEffect, useState } from 'react'
import { computeDashboardStats } from '@/lib/stamp4/simple-apply/dashboardStats'
import { getAllTrackedJobs } from '@/lib/stamp4/simple-apply/storage'

export function SprintDashboard({ refreshKey }: { refreshKey: number }) {
  const [stats, setStats] = useState(computeDashboardStats([]))
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError('')

      try {
        setStats(computeDashboardStats(await getAllTrackedJobs()))
      } catch {
        setError('Cloud tracker unavailable. Check Supabase and STAMP4 access secret env vars.')
        setStats(computeDashboardStats([]))
      } finally {
        setLoading(false)
      }
    }

    void load()
  }, [refreshKey])

  return (
    <section className="panel stack">
      <div>
        <p className="eyebrow">Sprint dashboard</p>
        <h2>Strategy check</h2>
      </div>

      {loading ? (
        <p>Loading dashboard...</p>
      ) : error ? (
        <p className="notice error">{error}</p>
      ) : stats.totalTracked === 0 ? (
        <p>No tracked jobs yet. Analyse and save a job to see stats here.</p>
      ) : (
        <>
          <div className="grid summary-grid">
            <article className="card">
              <p className="eyebrow">Tracked</p>
              <div className="metric">{stats.totalTracked}</div>
            </article>
            <article className="card">
              <p className="eyebrow">Average score</p>
              <div className="metric">{stats.averageScore}/100</div>
            </article>
            <article className="card">
              <p className="eyebrow">Application rate</p>
              <div className="metric">{stats.applicationRate}%</div>
              <p className="muted">Applied, follow-up or interview</p>
            </article>
            <article className="card">
              <p className="eyebrow">Weakest dimension</p>
              {stats.weakestDimension ? (
                <>
                  <div className="metric">{stats.weakestDimension.label}</div>
                  <p className="muted">Weakest in {stats.weakestDimension.timesWeakest} of {stats.totalTracked} jobs</p>
                </>
              ) : (
                <p className="muted">No score breakdowns saved yet - save a new job to start tracking this.</p>
              )}
            </article>
          </div>

          <div>
            <p className="eyebrow">Country split</p>
            <div className="source-actions">
              {stats.countrySplit.map((entry) => (
                <span className="badge ok" key={entry.country}>
                  {entry.country}: {entry.count} ({entry.percentage}%)
                </span>
              ))}
            </div>
          </div>
        </>
      )}
    </section>
  )
}
