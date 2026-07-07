import type { ParsedJob, ScoreBreakdown } from '@/lib/stamp4/simple-apply/types'

function reasoning(score: ScoreBreakdown, parsed: ParsedJob) {
  if (score.decision === 'Apply Now') return 'Strong role, domain, proof and permit alignment.'
  if (score.decision === 'Apply with Proof Fix') return 'Worth applying after tightening the highest-risk proof gaps.'
  if (score.decision === 'Save / Low Priority') return 'Some useful signals, but the role or permit fit needs caution.'
  return parsed.sponsorshipSignals.length ? 'Permit language or role fit makes this a poor immediate target.' : 'Too little target-lane evidence for Raj’s current strategy.'
}

const DECISION_CLASS: Record<ScoreBreakdown['decision'], string> = {
  'Apply Now': 'verdict-apply',
  'Apply with Proof Fix': 'verdict-proof-fix',
  'Save / Low Priority': 'verdict-low-priority',
  Skip: 'verdict-skip',
}

export function FitVerdictCard({ score, parsed }: { score: ScoreBreakdown; parsed: ParsedJob }) {
  return (
    <section className={`card verdict ${DECISION_CLASS[score.decision]}`}>
      <p className="eyebrow">Verdict</p>
      <h2>{score.decision}</h2>
      <div className="metric">{score.total}/120</div>
      <p>{reasoning(score, parsed)}</p>
    </section>
  )
}
