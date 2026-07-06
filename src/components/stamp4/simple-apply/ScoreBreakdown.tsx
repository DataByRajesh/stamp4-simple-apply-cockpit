import type { ScoreBreakdown as ScoreBreakdownType } from '@/lib/stamp4/simple-apply/types'

const labels: Array<[keyof Omit<ScoreBreakdownType, 'total' | 'decision'>, string]> = [
  ['roleFit', 'Role fit'],
  ['domainFit', 'Domain fit'],
  ['skillFit', 'Skill fit'],
  ['permitFit', 'Permit fit'],
  ['proofStrength', 'Proof strength'],
]

export function ScoreBreakdown({ score }: { score: ScoreBreakdownType }) {
  return (
    <section className="card stack">
      <div>
        <p className="eyebrow">Score</p>
        <h2>Breakdown</h2>
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
        </div>
      ))}
    </section>
  )
}
