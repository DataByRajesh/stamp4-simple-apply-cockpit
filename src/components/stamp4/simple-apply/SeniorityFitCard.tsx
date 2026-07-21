'use client'

import { explainSeniorityFit } from '@/lib/stamp4/simple-apply/seniorityFitExplainer'
import { RAJ_PROFILE } from '@/lib/stamp4/simple-apply/profile'
import type { ParsedJob, ScoreBreakdown } from '@/lib/stamp4/simple-apply/types'

const BADGE_CLASS: Record<ReturnType<typeof explainSeniorityFit>['verdict'], string> = {
  matched: 'ok',
  'moderate-stretch': 'medium',
  overreach: 'high',
}

const VERDICT_LABEL: Record<ReturnType<typeof explainSeniorityFit>['verdict'], string> = {
  matched: 'Matched',
  'moderate-stretch': 'Moderate stretch',
  overreach: 'Overreach',
}

export function SeniorityFitCard({ parsed, score }: { parsed: ParsedJob; score: ScoreBreakdown }) {
  const result = explainSeniorityFit(parsed, score)

  return (
    <section className="card stack seniority-fit">
      <div>
        <p className="eyebrow">Seniority fit</p>
        <h2>{VERDICT_LABEL[result.verdict]}</h2>
      </div>

      <span className={`badge ${BADGE_CLASS[result.verdict]}`}>
        {result.requiredYears !== null
          ? `${result.requiredYears}+ years required vs your ${RAJ_PROFILE.yearsExperience}`
          : result.hasSeniorTitle
            ? 'Senior-titled role, no years figure stated'
            : 'No years figure stated'}
      </span>

      <p>{result.headline}</p>

      {result.cappedDecision && (
        <div className="notice error">
          <strong>Score cap applied</strong>
          <p>
            This job&apos;s overall score was held back from Apply Now because of this gap alone - it would otherwise have
            cleared on domain, skill and proof strength.
          </p>
        </div>
      )}

      <details open={result.verdict !== 'matched'}>
        <summary>What to do about it</summary>
        <p>{result.guidance}</p>
      </details>
    </section>
  )
}
