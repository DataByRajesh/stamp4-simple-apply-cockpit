'use client'

import { Save } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { ApplicationPack } from '@/components/stamp4/simple-apply/ApplicationPack'
import { AlertSetupChecklist } from '@/components/stamp4/simple-apply/AlertSetupChecklist'
import { ApplicationTracker } from '@/components/stamp4/simple-apply/ApplicationTracker'
import { CorrectionActions } from '@/components/stamp4/simple-apply/CorrectionActions'
import { FitVerdictCard } from '@/components/stamp4/simple-apply/FitVerdictCard'
import { InterviewPrep } from '@/components/stamp4/simple-apply/InterviewPrep'
import { JobInputForm } from '@/components/stamp4/simple-apply/JobInputForm'
import type { AnalysisResult } from '@/components/stamp4/simple-apply/JobInputForm'
import { JobSourcesPanel } from '@/components/stamp4/simple-apply/JobSourcesPanel'
import { PermitRiskCard } from '@/components/stamp4/simple-apply/PermitRiskCard'
import { ProofMapperTable } from '@/components/stamp4/simple-apply/ProofMapperTable'
import { ScoreBreakdown } from '@/components/stamp4/simple-apply/ScoreBreakdown'
import { SprintDashboard } from '@/components/stamp4/simple-apply/SprintDashboard'
import { EMPTY_APPLICATION_PACK } from '@/lib/stamp4/simple-apply/generator'
import { saveJobToTracker } from '@/lib/stamp4/simple-apply/storage'
import type { TrackedJob } from '@/lib/stamp4/simple-apply/types'

function makeTrackedJob(result: AnalysisResult): TrackedJob {
  return {
    id:
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${result.parsed.company}-${result.parsed.roleTitle}`,
    company: result.parsed.company,
    roleTitle: result.parsed.roleTitle,
    country: result.parsed.country,
    location: result.parsed.location,
    salary: result.parsed.salary,
    score: result.score.total,
    decision: result.score.decision,
    scoreBreakdown: result.score,
    status: 'Saved',
    dateAdded: new Date().toISOString(),
    notes: result.skipped ? 'AI generation skipped (score below Apply threshold).' : '',
    generatedPack: result.skipped ? EMPTY_APPLICATION_PACK : result.pack,
    proofMap: result.proofs,
    correctionActions: result.skipped ? [] : result.actions,
    parsedJob: result.parsed,
  }
}

export default function SimpleApplyPage() {
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null)
  const [trackerRefresh, setTrackerRefresh] = useState(0)
  const [savedMessage, setSavedMessage] = useState('')
  const [saveStatus, setSaveStatus] = useState<'success' | 'error' | null>(null)
  const [saving, setSaving] = useState(false)
  const resultsRef = useRef<HTMLDivElement>(null)

  const trackedJob = useMemo(() => (analysis ? makeTrackedJob(analysis) : null), [analysis])

  useEffect(() => {
    if (analysis) {
      resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [analysis])

  async function saveCurrentJob() {
    if (!trackedJob || saving) return
    setSaving(true)

    try {
      await saveJobToTracker(trackedJob)
      setTrackerRefresh(value => value + 1)
      setSavedMessage('Saved to cloud tracker.')
      setSaveStatus('success')
    } catch (error) {
      console.error('Failed to save job', error)
      setSavedMessage('Cloud tracker unavailable. Check Supabase and STAMP4 access secret env vars.')
      setSaveStatus('error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="shell stack">
      <section className="hero-panel">
        <p className="eyebrow">Stamp4 Simple Apply</p>
        <h1>Permit-aware FinTech role cockpit</h1>
        <p>
          Built for Raj&apos;s Ireland/EU Financial Systems Analyst and Application Analyst lane. Deterministic scoring,
          optional AI prose, no scraping, no cloud storage.
        </p>
      </section>

      <SprintDashboard refreshKey={trackerRefresh} />

      <JobInputForm
        onAnalyse={(result) => {
          setAnalysis(result)
          // Reset save message when a new analysis is performed
          setSavedMessage('')
          setSaveStatus(null)
        }}
      />

      {analysis && (
        <div ref={resultsRef} className="stack">
          <section className="grid summary-grid">
            <FitVerdictCard parsed={analysis.parsed} score={analysis.score} />
            <ScoreBreakdown score={analysis.score} parsed={analysis.parsed} proofs={analysis.proofs} />
            <PermitRiskCard parsed={analysis.parsed} />
          </section>

          <ProofMapperTable proofs={analysis.proofs} />

          {analysis.skipped ? (
            <section className="panel stack">
              <div>
                <p className="eyebrow">Application pack</p>
                <h2>Generation skipped</h2>
              </div>
              <div className="notice error stack">
                <strong>{analysis.skipSummary}</strong>
                <ul>
                  {analysis.skipDetails.map((detail) => (
                    <li key={detail}>{detail}</li>
                  ))}
                </ul>
                <p className="muted">
                  No AI call was made for this role to save cost. If you still want a drafted application pack, edit
                  the fields above to improve the fit (or override your judgement) and re-run Confirm &amp; generate.
                </p>
              </div>
            </section>
          ) : (
            <>
              <ApplicationPack pack={analysis.pack} source={analysis.generationSource} />
              <InterviewPrep questions={analysis.questions} />
              <CorrectionActions actions={analysis.actions} />
            </>
          )}

          <section className="panel stack">
            <div className="toolbar">
              <div>
                <h2>Save this job</h2>
                <p>
                  {analysis.skipped
                    ? 'Save this rejected assessment for reference (no application pack included).'
                    : 'Persist the full analysis to the isolated Stamp4 Supabase project.'}
                </p>
              </div>
              <button className="button" type="button" onClick={saveCurrentJob} disabled={saving}>
                <Save size={18} aria-hidden="true" />
                {saving ? 'Saving...' : 'Save to Tracker'}
              </button>
            </div>
            {savedMessage && (
              <p className={`notice ${saveStatus === 'success' ? 'success' : 'error'}`}>{savedMessage}</p>
            )}
          </section>
        </div>
      )}

      <JobSourcesPanel />
      <AlertSetupChecklist />

      <ApplicationTracker refreshKey={trackerRefresh} />
    </main>
  )
}
