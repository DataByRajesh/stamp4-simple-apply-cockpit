'use client'

import { ClipboardCheck } from 'lucide-react'
import { useState } from 'react'
import { generateApplicationOutputs } from '@/lib/stamp4/simple-apply/generator'
import { parseJobDescription } from '@/lib/stamp4/simple-apply/parser'
import { mapProofs } from '@/lib/stamp4/simple-apply/proofMapper'
import { scoreJob } from '@/lib/stamp4/simple-apply/scoring'
import type {
  ApplicationPack,
  CorrectionAction,
  InterviewQuestion,
  ParsedJob,
  ProofMapping,
  ScoreBreakdown,
} from '@/lib/stamp4/simple-apply/types'

export interface AnalysisResult {
  parsed: ParsedJob
  score: ScoreBreakdown
  proofs: ProofMapping[]
  pack: ApplicationPack
  questions: InterviewQuestion[]
  actions: CorrectionAction[]
}

export function JobInputForm({ onAnalyse }: { onAnalyse: (result: AnalysisResult) => void }) {
  const [rawText, setRawText] = useState('')
  const [isAnalysing, setIsAnalysing] = useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsAnalysing(true)

    try {
      const parsed = parseJobDescription(rawText)
      const proofs = mapProofs(parsed)
      const score = scoreJob(parsed)
      const generated = await generateApplicationOutputs(parsed, score, proofs)

      onAnalyse({
        parsed,
        score,
        proofs,
        pack: generated.pack,
        questions: generated.questions,
        actions: generated.actions,
      })
    } finally {
      setIsAnalysing(false)
    }
  }

  return (
    <form className="panel stack" onSubmit={handleSubmit}>
      <div>
        <p className="eyebrow">Manual JD paste</p>
        <h2>Analyse a role description</h2>
        <p>Deterministic parsing and scoring, with optional AI prose generation and deterministic fallback.</p>
      </div>
      <textarea
        className="textarea"
        value={rawText}
        onChange={(event) => setRawText(event.target.value)}
        placeholder="Paste the full job description here..."
      />
      <div className="toolbar">
        <span className="muted">{rawText.trim().length} characters</span>
        <button className="button" disabled={!rawText.trim() || isAnalysing} type="submit">
          <ClipboardCheck size={18} aria-hidden="true" />
          {isAnalysing ? 'Analysing...' : 'Analyse'}
        </button>
      </div>
    </form>
  )
}
