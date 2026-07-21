'use client'

import { ExternalLink, Sparkles } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { matchesTargetRoles } from '@/lib/stamp4/simple-apply/atsFeeds'
import { seenPostingTrackedJobId, savePendingJd } from '@/lib/stamp4/simple-apply/pendingJdHandoff'
import { RAJ_PROFILE } from '@/lib/stamp4/simple-apply/profile'
import { buildSkipReason } from '@/lib/stamp4/simple-apply/skipReason'
import { buildJdRawText, isEmailWorthyMatch, scorePosting } from '@/lib/stamp4/simple-apply/sponsorMatchScoring'
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

function postingExplanation(posting: SeenSponsorPosting): string {
  if (isEmailWorthyMatch(posting.decision ?? '', posting.title, RAJ_PROFILE.targetRoleLane)) {
    return 'Target-lane match; email-worthy when first seen.'
  }

  if (!matchesTargetRoles(posting.title, RAJ_PROFILE.targetRoleLane)) {
    return 'Not emailed: title does not match the target role lane.'
  }

  if (posting.decision === 'Skip') {
    if (!posting.descriptionText) return 'Not emailed: stored decision is Skip, but no JD text was captured for details.'

    const { parsed, score } = scorePosting(posting.companyName, posting.title, posting.location, posting.descriptionText)
    const reason = buildSkipReason(score, parsed)
    return `Not emailed: ${reason.details.join(' ')}`
  }

  return 'Target-lane match; email-worthy when first seen.'
}

export function SeenPostingsTable() {
  const router = useRouter()
  const [postings, setPostings] = useState<SeenSponsorPosting[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  useEffect(() => {
    apiCall<SeenSponsorPosting[]>('seen-postings', { method: 'GET' })
      .then(setPostings)
      .catch(() => setLoadError('Could not load recently seen postings.'))
      .finally(() => setLoading(false))
  }, [])

  function sendToCockpit(posting: SeenSponsorPosting) {
    const rawText = buildJdRawText(posting.companyName, posting.title, posting.location, posting.descriptionText ?? '')
    savePendingJd(rawText, seenPostingTrackedJobId(posting.companyName, posting.externalId))
    router.push('/stamp4/simple-apply')
  }

  return (
    <section className="panel stack">
      <div>
        <p className="eyebrow">Sponsor companies</p>
        <h2>Recently seen postings</h2>
        <p>
          Every role the daily poll has seen at an auto-monitored company, including title-lane misses and Skip-tier
          matches that were recorded but not emailed - so you can sanity-check the filter isn&apos;t hiding something worth
          a look.
        </p>
      </div>

      {loading ? (
        <p>Loading recent postings...</p>
      ) : loadError ? (
        <p className="notice error">{loadError}</p>
      ) : postings.length === 0 ? (
        <p>No postings seen yet - the daily poll hasn&apos;t found roles at a monitored company.</p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Score</th>
                <th>Role</th>
                <th>Company</th>
                <th>Location</th>
                <th>Why shown</th>
                <th>Seen</th>
                <th>Deep dive</th>
              </tr>
            </thead>
            <tbody>
              {postings.map((posting) => (
                <tr key={`${posting.companyName}-${posting.externalId}`}>
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
                  <td>
                    {posting.companyName}
                    {posting.verifiedSponsor && (
                      <span
                        className="badge ok"
                        title="Matched against the Irish government's employment permit register"
                      >
                        Verified sponsor
                      </span>
                    )}
                  </td>
                  <td>{posting.location ?? '-'}</td>
                  <td>{postingExplanation(posting)}</td>
                  <td className="muted">{new Date(posting.firstSeenAt).toLocaleDateString()}</td>
                  <td>
                    <button
                      className="button secondary"
                      type="button"
                      disabled={!posting.descriptionText}
                      onClick={() => sendToCockpit(posting)}
                      title={posting.descriptionText ? undefined : 'No JD text was captured for this posting'}
                    >
                      <Sparkles size={14} aria-hidden="true" />
                      Send to Cockpit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
