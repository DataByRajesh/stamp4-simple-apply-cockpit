'use client'

import { useEffect, useState } from 'react'
import { apiCall } from '@/lib/stamp4/simple-apply/storage'
import type { GermanyEmployer, GermanyEmployerTier } from '@/lib/stamp4/simple-apply/germanyEmployers'

type Universe = {
  metadata: { sourcePage: string; blueCardSource: string; blueCardGeneralSalary2026: number; blueCardReducedSalary2026: number; jobsAnalysed: number }
  tierCounts: Record<GermanyEmployerTier, number>
  total: number
  employers: GermanyEmployer[]
}

export function GermanyEmployerUniverse() {
  const [data, setData] = useState<Universe | null>(null)
  const [query, setQuery] = useState('')
  const [tier, setTier] = useState<GermanyEmployerTier | ''>('aligned')
  useEffect(() => {
    const timer = setTimeout(() => {
      const params = new URLSearchParams({ limit: '50' })
      if (query) params.set('q', query)
      if (tier) params.set('tier', tier)
      apiCall<Universe>(`germany-employers?${params}`).then(setData).catch(() => setData(null))
    }, 200)
    return () => clearTimeout(timer)
  }, [query, tier])
  return (
    <section className="panel stack">
      <div><p className="eyebrow">Germany focus</p><h2>500 current-hiring employers</h2>
        <p>Target-role evidence from current Federal Employment Agency listings. Germany has no sponsor register, so verify visa support, language and salary per vacancy.</p>
      </div>
      {data && <div className="toolbar">
        <span className="badge ok">{data.tierCounts.aligned} aligned</span>
        <span className="badge">{data.tierCounts.review} review</span>
        <span className="badge low">{data.metadata.jobsAnalysed.toLocaleString()} roles analysed</span>
        <a href={data.metadata.sourcePage} target="_blank" rel="noreferrer">Government job portal</a>
        <a href={data.metadata.blueCardSource} target="_blank" rel="noreferrer">Blue Card rules</a>
      </div>}
      {data && <p className="notice info">2026 Blue Card screen: €{data.metadata.blueCardGeneralSalary2026.toLocaleString()} general; €{data.metadata.blueCardReducedSalary2026.toLocaleString()} reduced threshold where eligible.</p>}
      <div className="grid two-grid">
        <input className="input" placeholder="Search employer or role" value={query} onChange={(event) => setQuery(event.target.value)} />
        <select className="select" value={tier} onChange={(event) => setTier(event.target.value as GermanyEmployerTier | '')}>
          <option value="">All 500</option><option value="aligned">Aligned</option><option value="review">Review</option>
        </select>
      </div>
      {!data ? <p>Loading German employers...</p> : <>
        <p className="muted">{data.total} matches; showing up to 50.</p>
        <div className="stack compact-stack">{data.employers.map((employer) =>
          <div className="source-row" key={employer.name}>
            <div className="source-heading"><strong>#{employer.relevanceRank} {employer.name}</strong>
              <span className={`badge ${employer.tier === 'aligned' ? 'ok' : ''}`}>{employer.activeRoleCount} target roles</span>
            </div>
            <p className="muted">{employer.locations.join(', ') || 'Germany'} | Latest {employer.latestPublished}</p>
            <p>{employer.titles.slice(0, 2).join(' | ')}</p>
          </div>)}</div>
      </>}
    </section>
  )
}
