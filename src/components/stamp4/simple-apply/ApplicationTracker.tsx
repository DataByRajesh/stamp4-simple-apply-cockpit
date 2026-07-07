'use client'

import { Download, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  deleteJobFromTracker,
  exportBackup,
  getAllTrackedJobs,
  updateJobNotes,
  updateJobStatus,
} from '@/lib/stamp4/simple-apply/storage'
import type { TrackedJob, TrackerStatus } from '@/lib/stamp4/simple-apply/types'

const STATUSES: TrackerStatus[] = ['Saved', 'Applied', 'Follow-up', 'Interview', 'Rejected', 'Archived']
const NOTES_SAVE_DELAY_MS = 600

export function ApplicationTracker({ refreshKey }: { refreshKey: number }) {
  const [jobs, setJobs] = useState<TrackedJob[]>([])
  const [sortBy, setSortBy] = useState<'date' | 'score'>('date')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [exporting, setExporting] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [noteErrorId, setNoteErrorId] = useState<string | null>(null)
  const notesTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  useEffect(() => {
    const timers = notesTimers.current
    return () => {
      Object.values(timers).forEach(clearTimeout)
    }
  }, [])

  async function refresh() {
    setLoading(true)
    setError('')

    try {
      setJobs(await getAllTrackedJobs())
    } catch {
      setError('Cloud tracker unavailable. Check Supabase and STAMP4 access secret env vars.')
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

  async function downloadBackup() {
    if (exporting) return
    setExporting(true)

    try {
      const backup = await exportBackup()
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `stamp4-simple-apply-backup-${new Date().toISOString().slice(0, 10)}.json`
      link.click()
      URL.revokeObjectURL(url)
    } catch {
      setError('Could not export backup. Check Supabase and STAMP4 access secret env vars.')
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
    } catch {
      setError('Could not delete job from cloud tracker.')
    } finally {
      setDeletingId(null)
    }
  }

  const sortedJobs = useMemo(() => {
    return [...jobs].sort((a, b) =>
      sortBy === 'score'
        ? b.score - a.score
        : new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime(),
    )
  }, [jobs, sortBy])

  return (
    <section className="panel stack">
      <div className="toolbar">
        <div>
          <p className="eyebrow">Tracker</p>
          <h2>Saved applications</h2>
        </div>
        <div className="source-actions">
          <select className="select" value={sortBy} onChange={(event) => setSortBy(event.target.value as 'date' | 'score')}>
            <option value="date">Sort by date</option>
            <option value="score">Sort by score</option>
          </select>
          <button className="button secondary" type="button" onClick={downloadBackup} disabled={exporting}>
            <Download size={16} aria-hidden="true" />
            {exporting ? 'Exporting...' : 'Export backup'}
          </button>
        </div>
      </div>
      {loading ? (
        <p>Loading tracker...</p>
      ) : error ? (
        <p className="muted">{error}</p>
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
                <tr key={job.id}>
                  <td>
                    <strong>{job.roleTitle}</strong>
                    <br />
                    <span className="muted">{job.location || job.country || 'Location unclear'}</span>
                  </td>
                  <td>{job.company}</td>
                  <td>
                    {job.score}/100
                    <br />
                    <span className="muted">{job.decision}</span>
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
                        } catch {
                          setJobs((current) =>
                            current.map((item) => (item.id === job.id ? { ...item, status: previousStatus } : item)),
                          )
                          setError(`Could not save status change for "${job.roleTitle}". Reverted.`)
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
                    {noteErrorId === job.id && <p className="muted">Note did not save. Edit again to retry.</p>}
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
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
