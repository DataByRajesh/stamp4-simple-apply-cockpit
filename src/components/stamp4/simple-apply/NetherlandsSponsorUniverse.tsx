'use client'

import { useEffect, useState } from 'react'
import { apiCall } from '@/lib/stamp4/simple-apply/storage'
import type { RecognisedSponsor, RecognisedSponsorTier } from '@/lib/stamp4/simple-apply/netherlandsSponsors'

type Universe = {
  metadata: { sourcePage: string; registerUpdated: string; totalRecognisedSponsors: number }
  tierCounts: Record<RecognisedSponsorTier, number>
  total: number
  employers: RecognisedSponsor[]
}

export function NetherlandsSponsorUniverse() {
  const [data, setData] = useState<Universe | null>(null)
  const [query, setQuery] = useState('')
  const [tier, setTier] = useState<RecognisedSponsorTier | ''>('aligned')
  useEffect(() => {
    const timer = setTimeout(() => {
      const params = new URLSearchParams({ limit: '50' })
      if (query) params.set('q', query)
      if (tier) params.set('tier', tier)
      apiCall<Universe>(`netherlands-sponsors?${params}`).then(setData).catch(() => setData(null))
    }, 200)
    return () => clearTimeout(timer)
  }, [query, tier])
  return (
    <section className="panel stack">
      <div><p className="eyebrow">Netherlands focus</p><h2>500 recognised sponsors</h2>
        <p>Selected for role relevance from the official IND work-sponsor register. Recognition is verified; vacancy-level sponsorship still needs confirmation.</p>
      </div>
      {data && <div className="toolbar">
        <span className="badge ok">{data.tierCounts.aligned} aligned</span>
        <span className="badge">{data.tierCounts.review} review</span>
        <span className="badge low">{data.metadata.totalRecognisedSponsors.toLocaleString()} in full register</span>
        <a href={data.metadata.sourcePage} target="_blank" rel="noreferrer">Official IND register</a>
      </div>}
      <div className="grid two-grid">
        <input className="input" placeholder="Search name or KvK" value={query} onChange={(event) => setQuery(event.target.value)} />
        <select className="select" value={tier} onChange={(event) => setTier(event.target.value as RecognisedSponsorTier | '')}>
          <option value="">All 500</option><option value="aligned">Aligned</option><option value="review">Review</option>
        </select>
      </div>
      {!data ? <p>Loading recognised sponsors...</p> : <>
        <p className="muted">{data.total} matches; showing up to 50. Register updated {data.metadata.registerUpdated}.</p>
        <div className="stack compact-stack">{data.employers.map((employer) =>
          <div className="source-row" key={employer.kvkNumber}>
            <div className="source-heading"><strong>#{employer.relevanceRank} {employer.name}</strong>
              <span className={`badge ${employer.tier === 'aligned' ? 'ok' : ''}`}>Recognised sponsor</span>
            </div><p className="muted">KvK {employer.kvkNumber} | {employer.reasons.slice(1).join(' | ') || 'Role relevance review required'}</p>
          </div>)}</div>
      </>}
    </section>
  )
}
