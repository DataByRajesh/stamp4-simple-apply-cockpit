'use client'

import { Download, Trash2 } from 'lucide-react'
import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import { explainScore } from '@/lib/stamp4/simple-apply/scoreExplainer'
import {
  deleteJobFromTracker,
  exportBackup,
  getAllTrackedJobs,
  updateJobNotes,
  updateJobStatus,
} from '@/lib/stamp4/simple-apply/storage'
import type { TrackedJob, TrackerStatus } from '@/lib/stamp4/simple-apply/types'

const STATUSES: TrackerStatus[] = [
  'Saved',
  'Qualified',
  'Contacted',
  'Applied',
  'Follow-up',
  'Recruiter Screen',
  'Interview',
  'Final Stage',
  'Offer',
  'Rejected',
  'Archived',
]
const NOTES_SAVE_DELAY_MS = 600

function sanitizeCsvField(value: string): string {
  // Guard against CSV/formula injection - a JD-derived field starting with one of these
  // would otherwise execute as a formula when the file is opened in Excel/Sheets.
  const guarded = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value
  return /[",\n]/.test(guarded) ? `"${guarded.replace(/"/g, '""')}"` : guarded
}

function jobsToCsv(jobs: TrackedJob[]): string {
  const headers = [
    'Role title',
    'Company',
    'Country',
    'Location',
    'Salary',
    'Score',
    'Decision',
    'Status',
    'Date added',
    'Notes',
  ]
  const rows = jobs.map((job) =>
    [
      job.roleTitle,
      job.company,
      job.country,
      job.location,
      job.salary ?? '',
      String(job.score),
      job.decision,
      job.status,
      job.dateAdded,
      job.notes,
    ]
      .map(sanitizeCsvField)
      .join(','),
  )
  return [headers.join(','), ...rows].join('\n')
}

function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

export function ApplicationTracker({ refreshKey }: { refreshKey: number }) {
  const [jobs, setJobs] = useState<TrackedJob[]>([])
  const [sortBy, setSortBy] = useState<'date' | 'score'>('date')
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [actionMessage, setActionMessage] = useState<{ text: string; kind: 'success' | 'error' } | null>(null)
  const [exporting, setExporting] = useState(false)
  const [exportFormat, setExportFormat] = useState<'json' | 'csv'>('json')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [noteErrorId, setNoteErrorId] = useState<string | null>(null)
  const [expandedWhyId, setExpandedWhyId] = useState<string | null>(null)
  const notesTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})
  const actionMessageTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => {
    const timers = notesTimers.current
    return () => {
      Object.values(timers).forEach(clearTimeout)
      clearTimeout(actionMessageTimer.current)
    }
  }, [])

  function flashActionMessage(text: string, kind: 'success' | 'error') {
    clearTimeout(actionMessageTimer.current)
    setActionMessage({ text, kind })
    actionMessageTimer.current = setTimeout(() => setActionMessage(null), 4000)
  }

  async function refresh() {
    setLoading(true)
    setLoadError('')

    try {
      setJobs(await getAllTrackedJobs())
    } catch {
      setLoadError('Cloud tracker unavailable. Check Supabase and STAMP4 access secret env vars.')
      setJobs([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // Standard fetch-on-mount pattern; setLoading(true) runs before the await, which the
    // react-hooks lint rule flags as a false positive for this case.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh()
  }, [refreshKey])

  const sortedJobs = useMemo(() => {
    return [...jobs].sort((a, b) =>
      sortBy === 'score'
        ? b.score - a.score
        : new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime(),
    )
  }, [jobs, sortBy])

  async function downloadBackup() {
    if (exporting) return
    setExporting(true)
    const today = new Date().toISOString().slice(0, 10)

    try {
      if (exportFormat === 'csv') {
        downloadFile(jobsToCsv(sortedJobs), `stamp4-simple-apply-tracker-${today}.csv`, 'text/csv')
        flashActionMessage('CSV exported (tracker summary only).', 'success')
      } else {
        const backup = await exportBackup()
        downloadFile(JSON.stringify(backup, null, 2), `stamp4-simple-apply-backup-${today}.json`, 'application/json')
        flashActionMessage('Full JSON backup downloaded.', 'success')
      }
    } catch {
      flashActionMessage('Could not export. Check Supabase and STAMP4 access secret env vars.', 'error')
    } finally {
      setExporting(false)
    }
  }

  function queueNotesSave(id: string, notes: string) {
    clearTimeout(notesTimers.current[id])
    notesTimers.current[id] = setTimeout(() => {
      updateJobNotes(id, notes).catch(() => setNoteErrorId(id))
    }, NOTES_SAVE_DELAY_MS)
  }

  async function handleDelete(job: TrackedJob) {
    if (deletingId) return
    if (!window.confirm(`Delete "${job.roleTitle}" at ${job.company} from the tracker? This cannot be undone.`)) return

    setDeletingId(job.id)
    try {
      await deleteJobFromTracker(job.id)
      await refresh()
      flashActionMessage(`Deleted "${job.roleTitle}" from the tracker.`, 'success')
    } catch {
      flashActionMessage('Could not delete job from cloud tracker.', 'error')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <section className="panel stack">
      <div className="toolbar">
        <div>
          <p className="eyebrow">Tracker</p>
          <h2>Interview conversion funnel</h2>
        </div>
        <div className="source-actions">
          <select className="select" value={sortBy} onChange={(event) => setSortBy(event.target.value as 'date' | 'score')}>
            <option value="date">Sort by date</option>
            <option value="score">Sort by score</option>
          </select>
          <select
            className="select"
            value={exportFormat}
            onChange={(event) => setExportFormat(event.target.value as 'json' | 'csv')}
            aria-label="Export format"
          >
            <option value="json">JSON (full backup)</option>
            <option value="csv">CSV (tracker summary)</option>
          </select>
          <button className="button secondary" type="button" onClick={downloadBackup} disabled={exporting}>
            <Download size={16} aria-hidden="true" />
            {exporting ? 'Exporting...' : 'Export'}
          </button>
        </div>
      </div>
      {actionMessage && <p className={`notice ${actionMessage.kind}`}>{actionMessage.text}</p>}
      {loading ? (
        <p>Loading tracker...</p>
      ) : loadError ? (
        <p className="notice error">{loadError}</p>
      ) : sortedJobs.length === 0 ? (
        <p>No saved jobs yet.</p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Role</th>
                <th>Company</th>
                <th>Score</th>
                <th>Status</th>
                <th>Notes</th>
                <th>Delete</th>
              </tr>
            </thead>
            <tbody>
              {sortedJobs.map((job) => (
                <Fragment key={job.id}>
                  <tr>
                  <td>
                    <strong>{job.roleTitle}</strong>
                    <br />
                    <span className="muted">{job.location || job.country || 'Location unclear'}</span>
                  </td>
                  <td>{job.company}</td>
                  <td>
                    {job.score}/5
                    <br />
                    <span className="muted">{job.decision}</span>
                    <br />
                    <button
                      className="button secondary"
                      type="button"
                      onClick={() => setExpandedWhyId((current) => (current === job.id ? null : job.id))}
                    >
                      {expandedWhyId === job.id ? 'Hide reasons' : 'Why this score?'}
                    </button>
                  </td>
                  <td>
                    <select
                      className="select"
                      value={job.status}
                      onChange={async (event) => {
                        const status = event.target.value as TrackerStatus
                        const previousStatus = job.status
                        setJobs((current) => current.map((item) => (item.id === job.id ? { ...item, status } : item)))
                        try {
                          await updateJobStatus(job.id, status)
                          flashActionMessage(`${job.roleTitle} marked as ${status}.`, 'success')
                        } catch {
                          setJobs((current) =>
                            current.map((item) => (item.id === job.id ? { ...item, status: previousStatus } : item)),
                          )
                          flashActionMessage(`Could not save status change for "${job.roleTitle}". Reverted.`, 'error')
                        }
                      }}
                    >
                      {STATUSES.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <input
                      className="input"
                      value={job.notes}
                      onChange={(event) => {
                        const notes = event.target.value
                        setNoteErrorId((current) => (current === job.id ? null : current))
                        setJobs((current) =>
                          current.map((item) => (item.id === job.id ? { ...item, notes } : item)),
                        )
                        queueNotesSave(job.id, notes)
                      }}
                    />
                    {noteErrorId === job.id && <p className="text-error">Note did not save. Edit again to retry.</p>}
                  </td>
                  <td>
                    <button
                      className="button ghost"
                      type="button"
                      aria-label={`Delete ${job.roleTitle}`}
                      disabled={deletingId === job.id}
                      onClick={() => handleDelete(job)}
                    >
                      <Trash2 size={16} aria-hidden="true" />
                    </button>
                  </td>
                  </tr>
                  {expandedWhyId === job.id && (
                    <tr>
                      <td colSpan={6}>
                        {job.scoreBreakdown && job.parsedJob ? (
                          <ul className="stack compact-stack">
                            {explainScore(job.scoreBreakdown, job.parsedJob, job.proofMap).map((explanation) => (
                              <li key={explanation.dimension}>
                                <strong>
                                  {explanation.dimension} ({explanation.points}/{explanation.cap}):
                                </strong>{' '}
                                {explanation.reason}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="muted">
                            Full breakdown unavailable for jobs saved before this feature. Re-analyse and re-save to
                            see it.
                          </p>
                        )}
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

