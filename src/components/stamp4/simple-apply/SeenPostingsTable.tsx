'use client'

import { ExternalLink } from 'lucide-react'
import { useEffect, useState } from 'react'
import { apiCall } from '@/lib/stamp4/simple-apply/storage'
import type { SeenSponsorPosting } from '@/lib/stamp4/simple-apply/types'

function decisionBadgeClass(decision: string | null): string {
  switch (decision) {
    case 'Apply Now':
      return 'ok'
    case 'Apply with Proof Fix':
      return 'medium'
    default:
      return 'low'
  }
}

export function SeenPostingsTable() {
  const [postings, setPostings] = useState<SeenSponsorPosting[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  useEffect(() => {
    apiCall<SeenSponsorPosting[]>('seen-postings', { method: 'GET' })
      .then(setPostings)
      .catch(() => setLoadError('Could not load recently seen postings.'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <section className="panel stack">
      <div>
        <p className="eyebrow">Sponsor companies</p>
        <h2>Recently seen postings</h2>
        <p>
          Every role the daily poll has found at an auto-monitored company, including Skip-tier matches that were
          recorded but not emailed - so you can sanity-check the filter isn&apos;t hiding something worth a look.
        </p>
      </div>

      {loading ? (
        <p>Loading recent postings...</p>
      ) : loadError ? (
        <p className="notice error">{loadError}</p>
      ) : postings.length === 0 ? (
        <p>No postings seen yet - the daily poll hasn&apos;t found a target-role-lane match at a monitored company.</p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Score</th>
                <th>Role</th>
                <th>Company</th>
                <th>Location</th>
                <th>Seen</th>
              </tr>
            </thead>
            <tbody>
              {postings.map((posting) => (
                <tr key={`${posting.companyName}-${posting.title}-${posting.firstSeenAt}`}>
                  <td>
                    {posting.scoreTotal !== null && (
                      <span className={`badge ${decisionBadgeClass(posting.decision)}`}>
                        {posting.scoreTotal}/5 {posting.decision}
                      </span>
                    )}
                  </td>
                  <td>
                    <a href={posting.url} target="_blank" rel="noreferrer">
                      {posting.title}
                      <ExternalLink size={14} aria-hidden="true" />
                    </a>
                  </td>
                  <td>{posting.companyName}</td>
                  <td>{posting.location ?? '-'}</td>
                  <td className="muted">{new Date(posting.firstSeenAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
