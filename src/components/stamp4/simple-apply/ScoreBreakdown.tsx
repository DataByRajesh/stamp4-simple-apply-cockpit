'use client'

import { useState } from 'react'
import { explainScore } from '@/lib/stamp4/simple-apply/scoreExplainer'
import type { ParsedJob, ProofMapping, ScoreBreakdown as ScoreBreakdownType } from '@/lib/stamp4/simple-apply/types'

const labels: Array<[keyof Omit<ScoreBreakdownType, 'total' | 'decision'>, string]> = [
  ['roleFit', 'Role fit'],
  ['domainFit', 'Domain fit'],
  ['skillFit', 'Skill fit'],
  ['permitFit', 'Permit fit'],
  ['proofStrength', 'Proof strength'],
]

export function ScoreBreakdown({
  score,
  parsed,
  proofs,
}: {
  score: ScoreBreakdownType
  parsed?: ParsedJob
  proofs?: ProofMapping[]
}) {
  const [showWhy, setShowWhy] = useState(false)
  const explanations = parsed ? explainScore(score, parsed, proofs ?? []) : null

  return (
    <section className="card stack">
      <div className="toolbar">
        <div>
          <p className="eyebrow">Score</p>
          <h2>Breakdown</h2>
        </div>
        {explanations && (
          <button className="button ghost" type="button" onClick={() => setShowWhy((current) => !current)}>
            {showWhy ? 'Hide reasons' : 'Why this score?'}
          </button>
        )}
      </div>
      {labels.map(([key, label]) => (
        <div key={key}>
          <div className="toolbar">
            <strong>{label}</strong>
            <span>{score[key]}/20</span>
          </div>
          <div className="progress" aria-label={`${label}: ${score[key]} out of 20`}>
            <span style={{ width: `${(score[key] / 20) * 100}%` }} />
          </div>
          {showWhy && explanations && (
            <p className="muted">{explanations.find((e) => e.dimension === label)?.reason}</p>
          )}
        </div>
      ))}
    </section>
  )
}
