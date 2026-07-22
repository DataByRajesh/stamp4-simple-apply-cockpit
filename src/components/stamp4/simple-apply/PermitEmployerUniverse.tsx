'use client'

import { useEffect, useState } from 'react'
import { apiCall } from '@/lib/stamp4/simple-apply/storage'
import type { PermitEmployer, PermitEmployerTier } from '@/lib/stamp4/simple-apply/permitEmployers'

type Universe = {
  metadata: { sourceYear: number; sourcePage: string; disclaimer: string }
  tierCounts: Record<PermitEmployerTier, number>
  total: number
  employers: PermitEmployer[]
}

export function PermitEmployerUniverse() {
  const [data, setData] = useState<Universe | null>(null)
  const [query, setQuery] = useState('')
  const [tier, setTier] = useState<PermitEmployerTier | ''>('aligned')
  useEffect(() => {
    const timer = setTimeout(() => {
      const params = new URLSearchParams({ limit: '50' })
      if (query) params.set('q', query)
      if (tier) params.set('tier', tier)
      apiCall<Universe>(`permit-employers?${params}`).then(setData).catch(() => setData(null))
    }, 200)
    return () => clearTimeout(timer)
  }, [query, tier])
  const universeTotal = data ? data.tierCounts.aligned + data.tierCounts.review + data.tierCounts.evidence : null
  return (
    <section className="panel stack">
      <div><p className="eyebrow">Ireland focus</p><h2>{universeTotal ?? '...'} permit-active employers</h2>
        <p>Official {data?.metadata.sourceYear ?? ''} permit evidence ranked for triage. Historical permits do not guarantee sponsorship for a vacancy.</p>
      </div>
      {data && <div className="toolbar">
        <span className="badge ok">{data.tierCounts.aligned} aligned</span>
        <span className="badge">{data.tierCounts.review} review</span>
        <span className="badge low">{data.tierCounts.evidence} evidence-only</span>
        <a href={data.metadata.sourcePage} target="_blank" rel="noreferrer">Official DETE source</a>
      </div>}
      <div className="grid two-grid">
        <input className="input" placeholder="Search employer" value={query} onChange={(event) => setQuery(event.target.value)} />
        <select className="select" value={tier} onChange={(event) => setTier(event.target.value as PermitEmployerTier | '')}>
          <option value="">All{universeTotal ? ` ${universeTotal}` : ''}</option><option value="aligned">Aligned</option>
          <option value="review">Review</option><option value="evidence">Evidence only</option>
        </select>
      </div>
      {!data ? <p>Loading employer universe...</p> : <>
        <p className="muted">{data.total} matches; showing up to 50.</p>
        <div className="stack compact-stack">{data.employers.map((employer) =>
          <div className="source-row" key={employer.name}>
            <div className="source-heading"><strong>#{employer.permitRank} {employer.name}</strong>
              <span className={`badge ${employer.tier === 'aligned' ? 'ok' : employer.tier === 'evidence' ? 'low' : ''}`}>{employer.permitCount} permits</span>
            </div><p className="muted">{employer.reasons.join(' | ')}</p>
          </div>)}</div>
      </>}
    </section>
  )
}

