'use client'

import { ClipboardCheck, Sparkles } from 'lucide-react'
import { useMemo, useState } from 'react'
import { generateApplicationOutputs, type GenerationSource } from '@/lib/stamp4/simple-apply/generator'
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
  generationSource: GenerationSource
}

type EditableField = 'roleTitle' | 'company' | 'country' | 'location' | 'salary'

function findUndetectedFields(parsed: ParsedJob): string[] {
  const missing: string[] = []
  if (parsed.roleTitle === 'Unknown role') missing.push('role title')
  if (parsed.company === 'Unknown company') missing.push('company')
  if (!parsed.country && !parsed.location) missing.push('country/location')
  if (!parsed.salary) missing.push('salary')
  return missing
}

export function JobInputForm({ onAnalyse }: { onAnalyse: (result: AnalysisResult) => void }) {
  const [rawText, setRawText] = useState('')
  const [parsedDraft, setParsedDraft] = useState<ParsedJob | null>(null)
  const [isAnalysing, setIsAnalysing] = useState(false)
  const [error, setError] = useState('')

  const undetectedFields = useMemo(
    () => (parsedDraft ? findUndetectedFields(parsedDraft) : []),
    [parsedDraft],
  )

  function handleParse(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setParsedDraft(parseJobDescription(rawText))
  }

  function updateField(field: EditableField, value: string) {
    setParsedDraft((current) => (current ? { ...current, [field]: value } : current))
  }

  function handleBackToText() {
    setParsedDraft(null)
    setError('')
  }

  async function handleGenerate() {
    if (!parsedDraft) return
    setIsAnalysing(true)
    setError('')

    try {
      const proofs = mapProofs(parsedDraft)
      const score = scoreJob(parsedDraft)
      const generated = await generateApplicationOutputs(parsedDraft, score, proofs)

      onAnalyse({
        parsed: parsedDraft,
        score,
        proofs,
        pack: generated.pack,
        questions: generated.questions,
        actions: generated.actions,
        generationSource: generated.source,
      })
    } catch (err) {
      console.error('Failed to analyse job description', err)
      setError('Could not analyse that job description. Check the pasted text and try again.')
    } finally {
      setIsAnalysing(false)
    }
  }

  if (parsedDraft) {
    return (
      <section className="panel stack">
        <div>
          <p className="eyebrow">Review parsed details</p>
          <h2>Confirm before scoring</h2>
          <p>Scoring and generated content use these fields directly - fix anything the parser got wrong.</p>
        </div>

        {undetectedFields.length > 0 && (
          <p className="notice warning">
            Could not confidently detect: {undetectedFields.join(', ')}. Fill these in manually for an accurate score.
          </p>
        )}

        <div className="grid two-grid">
          <label className="stack compact-stack">
            <span className="muted">Role title</span>
            <input
              className="input"
              value={parsedDraft.roleTitle}
              onChange={(event) => updateField('roleTitle', event.target.value)}
            />
          </label>
          <label className="stack compact-stack">
            <span className="muted">Company</span>
            <input
              className="input"
              value={parsedDraft.company}
              onChange={(event) => updateField('company', event.target.value)}
            />
          </label>
          <label className="stack compact-stack">
            <span className="muted">Country</span>
            <input
              className="input"
              value={parsedDraft.country}
              onChange={(event) => updateField('country', event.target.value)}
            />
          </label>
          <label className="stack compact-stack">
            <span className="muted">Location</span>
            <input
              className="input"
              value={parsedDraft.location}
              onChange={(event) => updateField('location', event.target.value)}
            />
          </label>
          <label className="stack compact-stack">
            <span className="muted">Salary</span>
            <input
              className="input"
              value={parsedDraft.salary ?? ''}
              onChange={(event) => updateField('salary', event.target.value)}
              placeholder="Not stated"
            />
          </label>
        </div>

        <div className="toolbar">
          <button className="button ghost" type="button" onClick={handleBackToText} disabled={isAnalysing}>
            Back to JD text
          </button>
          <button className="button" type="button" onClick={handleGenerate} disabled={isAnalysing}>
            <Sparkles size={18} aria-hidden="true" />
            {isAnalysing ? 'Generating...' : 'Confirm & generate'}
          </button>
        </div>
        {error && <p className="muted">{error}</p>}
      </section>
    )
  }

  return (
    <form className="panel stack" onSubmit={handleParse}>
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
        <button className="button" disabled={!rawText.trim()} type="submit">
          <ClipboardCheck size={18} aria-hidden="true" />
          Analyse
        </button>
      </div>
      {error && <p className="muted">{error}</p>}
    </form>
  )
}
