'use client'

import { useEffect, useState } from 'react'
import { AnalyticsOverview } from '@/components/stamp4/simple-apply/analytics/AnalyticsOverview'
import { BottleneckInsightsView } from '@/components/stamp4/simple-apply/analytics/BottleneckInsightsView'
import { CompaniesSourcesView } from '@/components/stamp4/simple-apply/analytics/CompaniesSourcesView'
import { ConversionFunnelView } from '@/components/stamp4/simple-apply/analytics/ConversionFunnelView'
import { KeywordSignalsTable } from '@/components/stamp4/simple-apply/analytics/KeywordSignalsTable'
import { ScorePatternView } from '@/components/stamp4/simple-apply/analytics/ScorePatternView'
import { TrendsChart } from '@/components/stamp4/simple-apply/analytics/TrendsChart'
import { apiCall, getAllTrackedJobs } from '@/lib/stamp4/simple-apply/storage'
import type { SeenSponsorPosting, TrackedJob } from '@/lib/stamp4/simple-apply/types'

const SUB_VIEWS = [
  'Overview',
  'Trends Over Time',
  'Companies & Sources',
  'Score Breakdown Patterns',
  'Conversion Funnel',
  'Bottlenecks & Actions',
  'Keyword Signals',
] as const

type SubView = (typeof SUB_VIEWS)[number]

export default function AnalyticsPage() {
  const [jobs, setJobs] = useState<TrackedJob[]>([])
  const [sponsorPostings, setSponsorPostings] = useState<SeenSponsorPosting[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [activeView, setActiveView] = useState<SubView>('Overview')

  useEffect(() => {
    Promise.all([getAllTrackedJobs(), apiCall<SeenSponsorPosting[]>('seen-postings', { method: 'GET' })])
      .then(([trackedJobs, postings]) => {
        setJobs(trackedJobs)
        setSponsorPostings(postings)
      })
      .catch(() => setLoadError('Cloud data unavailable. Check Supabase and STAMP4 access secret env vars.'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <main className="shell stack">
      <section className="hero-panel">
        <p className="eyebrow">Stamp4 Simple Apply</p>
        <h1>Analytics</h1>
        <p>
          Job-search analytics, structured like a web analytics tool: an overview, then focused views you can drill
          into. Every view needs at least 10 tracked jobs before it shows anything - a handful of points would just
          be misleading dressed up as a chart.
        </p>
      </section>

      <nav className="top-nav" style={{ position: 'static', borderRadius: 'var(--radius-lg)' }}>
        <div className="top-nav-inner" style={{ flexWrap: 'wrap' }}>
          {SUB_VIEWS.map((view) => (
            <button
              key={view}
              type="button"
              className={`top-nav-link${activeView === view ? ' active' : ''}`}
              style={{ background: 'none', border: 'none', cursor: 'pointer', font: 'inherit' }}
              onClick={() => setActiveView(view)}
            >
              {view}
            </button>
          ))}
        </div>
      </nav>

      {loading ? (
        <p>Loading analytics...</p>
      ) : loadError ? (
        <p className="notice error">{loadError}</p>
      ) : (
        <>
          {activeView === 'Overview' && <AnalyticsOverview jobs={jobs} />}
          {activeView === 'Trends Over Time' && <TrendsChart jobs={jobs} />}
          {activeView === 'Companies & Sources' && (
            <CompaniesSourcesView jobs={jobs} sponsorPostings={sponsorPostings} />
          )}
          {activeView === 'Score Breakdown Patterns' && <ScorePatternView jobs={jobs} />}
          {activeView === 'Conversion Funnel' && <ConversionFunnelView jobs={jobs} />}
          {activeView === 'Bottlenecks & Actions' && <BottleneckInsightsView jobs={jobs} />}
          {activeView === 'Keyword Signals' && <KeywordSignalsTable jobs={jobs} />}
        </>
      )}
    </main>
  )
}
