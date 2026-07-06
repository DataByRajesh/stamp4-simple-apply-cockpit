'use client'

import { Save } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
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
    notes: '',
    generatedPack: result.pack,
    proofMap: result.proofs,
    correctionActions: result.actions,
  }
}

export default function SimpleApplyPage() {
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null)
  const [trackerRefresh, setTrackerRefresh] = useState(0)
  const [savedMessage, setSavedMessage] = useState('')

  const trackedJob = useMemo(() => (analysis ? makeTrackedJob(analysis) : null), [analysis])

  async function saveCurrentJob() {
    if (!trackedJob) return

    try {
      await saveJobToTracker(trackedJob)
      setTrackerRefresh(value => value + 1)
      setSavedMessage('Saved to cloud tracker.')
    } catch (error) {
      console.error('Failed to save job', error)
      setSavedMessage('Cloud tracker unavailable. Check Supabase and STAMP4 access secret env vars.')
    }
  }

  return (
    <main className="shell stack">
      <section className="hero-panel">
        <p className="eyebrow">Stamp4 Simple Apply</p>
        <h1>Permit-aware FinTech role cockpit</h1>
        <p>
          Built for Raj's Ireland/EU Financial Systems Analyst and Application Analyst lane. Deterministic scoring,
          optional AI prose, no scraping, no cloud storage.
        </p>
      </section>

      <SprintDashboard refreshKey={trackerRefresh} />

      <JobInputForm
        onAnalyse={(result) => {
          setAnalysis(result)
          // Reset save message when a new analysis is performed
          setSavedMessage('')
        }}
      />

      <JobSourcesPanel />
      <AlertSetupChecklist />

      {analysis && (
        <>
          <section className="grid summary-grid">
            <FitVerdictCard parsed={analysis.parsed} score={analysis.score} />
            <ScoreBreakdown score={analysis.score} />
            <PermitRiskCard parsed={analysis.parsed} />
          </section>

          <ProofMapperTable proofs={analysis.proofs} />
          <ApplicationPack pack={analysis.pack} />
          <InterviewPrep questions={analysis.questions} />
          <CorrectionActions actions={analysis.actions} />

          <section className="panel toolbar">
            <div>
              <h2>Save this job</h2>
              <p>{savedMessage || 'Persist the full analysis to the isolated Stamp4 Supabase project.'}</p>
            </div>
            <button className="button" type="button" onClick={saveCurrentJob}>
              <Save size={18} aria-hidden="true" />
              Save to Tracker
            </button>
          </section>
        </>
      )}

      <ApplicationTracker refreshKey={trackerRefresh} />
    </main>
  )
}
