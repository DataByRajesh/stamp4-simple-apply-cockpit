'use client'

import { Download, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import {
  deleteJobFromTracker,
  exportBackup,
  getAllTrackedJobs,
  updateJobNotes,
  updateJobStatus,
} from '@/lib/stamp4/simple-apply/storage'
import type { TrackedJob, TrackerStatus } from '@/lib/stamp4/simple-apply/types'

const STATUSES: TrackerStatus[] = ['Saved', 'Applied', 'Follow-up', 'Interview', 'Rejected', 'Archived']

export function ApplicationTracker({ refreshKey }: { refreshKey: number }) {
  const [jobs, setJobs] = useState<TrackedJob[]>([])
  const [sortBy, setSortBy] = useState<'date' | 'score'>('date')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

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
    void refresh()
  }, [refreshKey])

  async function downloadBackup() {
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
          <button className="button secondary" type="button" onClick={downloadBackup}>
            <Download size={16} aria-hidden="true" />
            Export backup
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
                        setJobs((current) => current.map((item) => (item.id === job.id ? { ...item, status } : item)))
                        try {
                          await updateJobStatus(job.id, status)
                        } catch {
                          await refresh()
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
                        setJobs((current) =>
                          current.map((item) => (item.id === job.id ? { ...item, notes } : item)),
                        )
                        updateJobNotes(job.id, notes).catch(() => undefined)
                      }}
                    />
                  </td>
                  <td>
                    <button
                      className="button ghost"
                      type="button"
                      aria-label={`Delete ${job.roleTitle}`}
                      onClick={async () => {
                        try {
                          await deleteJobFromTracker(job.id)
                          await refresh()
                        } catch {
                          setError('Could not delete job from cloud tracker.')
                        }
                      }}
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
