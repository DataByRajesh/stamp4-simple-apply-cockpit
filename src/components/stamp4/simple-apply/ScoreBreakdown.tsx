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
  ['seniorityFit', 'Seniority fit'],
]

type Tier = 'top' | 'high' | 'mid' | 'low'

// Mirrors the Apply Now / Proof Fix / Save / Skip cutoffs in scoreJob() so a
// dimension's color always agrees with what the overall verdict would say about it.
function tierOf(value: number): Tier {
  if (value >= 4) return 'top'
  if (value >= 3) return 'high'
  if (value >= 2) return 'mid'
  return 'low'
}

function formatScore(value: number): string {
  const rounded = Math.round(value * 100) / 100
  return Number.isInteger(rounded) ? String(rounded) : String(rounded)
}

const RING_RADIUS = 26
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS

function ScoreRing({ value, max = 5 }: { value: number; max?: number }) {
  const pct = Math.max(0, Math.min(1, value / max))
  const offset = RING_CIRCUMFERENCE * (1 - pct)
  const tier = tierOf(value)

  return (
    <div className={`score-ring score-ring-${tier}`} aria-hidden="true">
      <svg viewBox="0 0 64 64">
        <circle className="ring-track" cx="32" cy="32" r={RING_RADIUS} />
        <circle
          className="ring-fill"
          cx="32"
          cy="32"
          r={RING_RADIUS}
          strokeDasharray={RING_CIRCUMFERENCE}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="ring-label">
        <span className="ring-value">{formatScore(value)}</span>
        <span className="ring-max">/{max}</span>
      </div>
    </div>
  )
}

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
    <section className="card stack score-card">
      <div className="toolbar">
        <div className="score-card-head">
          <ScoreRing value={score.total} />
          <div>
            <p className="eyebrow">Score</p>
            <h2>Breakdown</h2>
            <p className="muted">{score.decision}</p>
          </div>
        </div>
        {explanations && (
          <button className="button secondary" type="button" onClick={() => setShowWhy((current) => !current)}>
            {showWhy ? 'Hide reasons' : 'Why this score?'}
          </button>
        )}
      </div>
      <div className="score-grid">
        {labels.map(([key, label]) => {
          const value = score[key]
          const tier = tierOf(value)
          const pct = Math.max(0, Math.min(100, (value / 5) * 100))

          return (
            <div className="score-row" key={key}>
              <div className="score-row-head">
                <span className="score-row-label">{label}</span>
                <span className={`score-pill score-pill-${tier}`}>
                  {formatScore(value)}
                  <span className="score-pill-max">/5</span>
                </span>
              </div>
              <div className="meter" role="img" aria-label={`${label}: ${formatScore(value)} out of 5`}>
                <div className="meter-fill" data-tier={tier} style={{ width: `${pct}%` }} />
                <div className="meter-pips" aria-hidden="true">
                  <span />
                  <span />
                  <span />
                  <span />
                  <span />
                </div>
              </div>
              {showWhy && explanations && (
                <p className="muted">{explanations.find((e) => e.dimension === label)?.reason}</p>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}
