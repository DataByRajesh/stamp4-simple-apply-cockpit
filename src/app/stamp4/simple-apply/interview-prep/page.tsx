'use client'

import { useEffect, useMemo, useState } from 'react'
import { DeepInterviewPrep } from '@/components/stamp4/simple-apply/DeepInterviewPrep'
import { apiCall, getAllTrackedJobs } from '@/lib/stamp4/simple-apply/storage'
import type { InterviewPrepBundle, TrackedJob } from '@/lib/stamp4/simple-apply/types'

export default function InterviewPrepPage() {
  const [jobs, setJobs] = useState<TrackedJob[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [selectedId, setSelectedId] = useState('')
  const [bundle, setBundle] = useState<InterviewPrepBundle | null>(null)
  const [generating, setGenerating] = useState(false)
  const [generateError, setGenerateError] = useState('')

  useEffect(() => {
    getAllTrackedJobs()
      .then((allJobs) => setJobs(allJobs.filter((job) => job.parsedJob && job.scoreBreakdown)))
      .catch(() => setLoadError('Cloud tracker unavailable. Check Supabase and STAMP4 access secret env vars.'))
      .finally(() => setLoading(false))
  }, [])

  const selectedJob = useMemo(() => jobs.find((job) => job.id === selectedId) ?? null, [jobs, selectedId])

  async function generate() {
    if (!selectedJob?.parsedJob || !selectedJob.scoreBreakdown || generating) return
    setGenerating(true)
    setGenerateError('')
    setBundle(null)

    try {
      const result = await apiCall<InterviewPrepBundle>('interview-prep', {
        method: 'POST',
        body: JSON.stringify({
          parsed: selectedJob.parsedJob,
          score: selectedJob.scoreBreakdown,
          proofs: selectedJob.proofMap,
        }),
      })
      setBundle(result)
    } catch {
      setGenerateError('Live generation failed. The prep bundle was not produced.')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <main className="shell stack">
      <section className="hero-panel">
        <p className="eyebrow">Stamp4 Simple Apply</p>
        <h1>Interview prep</h1>
        <p>
          Pick a saved job and generate a fresh, tailored interview prep bundle on demand: questions by stage,
          questions to ask them, and salary-negotiation prep. Always a live AI call - if it fails, nothing generic
          is shown in its place.
        </p>
      </section>

      <section className="panel stack">
        <div>
          <p className="eyebrow">Tracked jobs</p>
          <h2>Select a job</h2>
        </div>

        {loading ? (
          <p>Loading tracked jobs...</p>
        ) : loadError ? (
          <p className="notice error">{loadError}</p>
        ) : jobs.length === 0 ? (
          <p>No tracked jobs with full analysis data yet. Analyse and save a job on the Cockpit tab first.</p>
        ) : (
          <div className="toolbar">
            <select
              className="select"
              value={selectedId}
              onChange={(event) => {
                setSelectedId(event.target.value)
                setBundle(null)
                setGenerateError('')
              }}
            >
              <option value="">Choose a job...</option>
              {jobs.map((job) => (
                <option key={job.id} value={job.id}>
                  {job.roleTitle} - {job.company}
                </option>
              ))}
            </select>
            <button className="button" type="button" onClick={generate} disabled={!selectedJob || generating}>
              {generating ? 'Generating live prep bundle...' : 'Generate live interview prep'}
            </button>
          </div>
        )}

        {generateError && (
          <div className="notice error stack">
            <strong>{generateError}</strong>
            <button className="button secondary" type="button" onClick={generate} disabled={!selectedJob || generating}>
              Retry
            </button>
          </div>
        )}
      </section>

      {bundle && <DeepInterviewPrep bundle={bundle} />}
    </main>
  )
}
