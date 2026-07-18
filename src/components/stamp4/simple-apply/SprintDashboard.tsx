'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { computeDashboardStats } from '@/lib/stamp4/simple-apply/dashboardStats'
import { getAllTrackedJobs, updateJobPlanning, updateJobStatus } from '@/lib/stamp4/simple-apply/storage'
import type { TrackedJob, TrackerStatus } from '@/lib/stamp4/simple-apply/types'

const DAY_MS = 86_400_000

function ageDays(job: TrackedJob) {
  return Math.max(0, Math.floor((Date.now() - new Date(job.updatedAt ?? job.dateAdded).getTime()) / DAY_MS))
}

function isQualityFit(job: TrackedJob) {
  return job.decision === 'Apply Now' || job.decision === 'Apply with Proof Fix'
}

function daysUntilDeadline(job: TrackedJob): number | null {
  if (!job.applicationDeadline) return null
  return Math.ceil((new Date(job.applicationDeadline + 'T23:59:59').getTime() - Date.now()) / DAY_MS)
}

function actionFor(job: TrackedJob): { rank: number; label: string; why: string; nextStatus?: TrackerStatus } | null {
  const today = new Date().toISOString().slice(0, 10)
  const outreach = job.outreach
  const interview = job.interviewExecution
  const offer = job.offerDecision

  if (offer?.offerDeadline && offer.decision === 'Undecided') {
    const days = Math.ceil((new Date(offer.offerDeadline + 'T23:59:59').getTime() - Date.now()) / DAY_MS)
    if (days >= 0 && days <= 3) return { rank: 130 - days, label: 'Decide or negotiate offer', why: `Offer deadline is ${days === 0 ? 'today' : `in ${days} day${days === 1 ? '' : 's'}`}.` }
  }
  if (interview?.scheduledAt) {
    const hours = (new Date(interview.scheduledAt).getTime() - Date.now()) / 3_600_000
    if (hours >= 0 && hours <= 72) return { rank: 120 - Math.floor(hours / 24), label: 'Prepare for interview', why: `${interview.stage} is within 72 hours (${interview.timezone}).` }
  }
  if (outreach?.followUpDate && outreach.followUpDate < today && !['Replied', 'Declined'].includes(outreach.responseStatus)) {
    return { rank: 110, label: 'Send overdue outreach follow-up', why: `Follow-up was due ${outreach.followUpDate}.`, nextStatus: 'Follow-up' }
  }
  const age = ageDays(job)
  const deadlineDays = daysUntilDeadline(job)

  if (job.status === 'Saved' && deadlineDays !== null && deadlineDays >= 0 && deadlineDays <= 2) {
    return {
      rank: 95 - deadlineDays,
      label: 'Apply before deadline',
      why: deadlineDays === 0 ? 'Application closes today.' : 'Application closes in ' + deadlineDays + (deadlineDays === 1 ? ' day.' : ' days.'),
      nextStatus: 'Applied',
    }
  }
  if (job.status === 'Interview') return { rank: 100 + age, label: 'Prepare for interview', why: 'Closest active step to an offer.' }
  if (job.status === 'Applied' && age >= 5) return { rank: 80 + age, label: 'Send follow-up', why: age + ' days since the application was updated.', nextStatus: 'Follow-up' }
  if (job.status === 'Follow-up' && age >= 4) return { rank: 70 + age, label: 'Check response', why: age + ' days since the last follow-up activity.' }
  if (job.status === 'Saved' && isQualityFit(job)) return { rank: 60 + Math.round(job.score * 10) + age, label: 'Submit application', why: job.decision + ' at ' + job.score + '/5.', nextStatus: 'Applied' }
  if (job.status === 'Saved') return { rank: 20 + Math.round(job.score * 10), label: 'Review or archive', why: 'Low-priority role is still occupying the queue.' }
  return null
}

export function SprintDashboard({ refreshKey }: { refreshKey: number }) {
  const [jobs, setJobs] = useState<TrackedJob[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [dashboardNow] = useState(() => Date.now())

  async function load() {
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

  useEffect(() => { queueMicrotask(() => void load()) }, [refreshKey])

  const stats = useMemo(() => computeDashboardStats(jobs), [jobs])
  const actions = useMemo(
    () => jobs
      .map((job) => ({ job, action: actionFor(job) }))
      .filter((item): item is { job: TrackedJob; action: NonNullable<ReturnType<typeof actionFor>> } => Boolean(item.action))
      .sort((a, b) => b.action.rank - a.action.rank),
    [jobs],
  )
  const weekStart = useMemo(() => {
    const date = new Date()
    const day = date.getDay()
    date.setDate(date.getDate() - (day === 0 ? 6 : day - 1))
    date.setHours(0, 0, 0, 0)
    return date
  }, [])
  const touchedThisWeek = jobs.filter((job) => new Date(job.updatedAt ?? job.dateAdded) >= weekStart)
  const applications = touchedThisWeek.filter((job) => isQualityFit(job) && ['Applied', 'Follow-up', 'Interview'].includes(job.status)).length
  const followUps = touchedThisWeek.filter((job) => job.status === 'Follow-up').length
  const outreachDue = jobs.filter((job) => job.outreach?.followUpDate && job.outreach.followUpDate <= new Date().toISOString().slice(0, 10) && !['Replied', 'Declined'].includes(job.outreach.responseStatus)).length
  const interviewPrepDue = jobs.filter((job) => { const at = job.interviewExecution?.scheduledAt; return at && new Date(at).getTime() >= dashboardNow && new Date(at).getTime() - dashboardNow <= 72 * 3_600_000 }).length
  const offerDeadlines = jobs.filter((job) => job.offerDecision?.offerDeadline && job.offerDecision.decision === 'Undecided').length
  const interviews = touchedThisWeek.filter((job) => job.status === 'Interview').length

  async function advance(job: TrackedJob, status: TrackerStatus) {
    setUpdatingId(job.id)
    try {
      await updateJobStatus(job.id, status)
      await load()
    } catch {
      setError('Could not update ' + job.roleTitle + '.')
    } finally {
      setUpdatingId(null)
    }
  }

  async function savePlanning(job: TrackedJob, applicationUrl: string, applicationDeadline: string) {
    try {
      await updateJobPlanning(job.id, applicationUrl, applicationDeadline)
      await load()
    } catch {
      setError('Could not save planning details for ' + job.roleTitle + '.')
    }
  }

  return (
    <section className="panel stack">
      <div>
        <p className="eyebrow">Interview landing sprint</p>
        <h2>8:00 London daily command centre</h2>
        <p className="muted">One morning queue: offer deadlines, interviews, closing applications, recruiter follow-ups and strongest new targets.</p>
      </div>
      {loading ? <p>Loading sprint...</p> : error ? <p className="notice error">{error}</p> : jobs.length === 0 ? <p>No tracked jobs yet. Analyse and save a role to start the sprint.</p> : (
        <>
          <div className="grid summary-grid">
            <article className="card"><p className="eyebrow">Quality applications</p><div className="metric">{applications}/5</div><p className="muted">This week</p></article>
            <article className="card"><p className="eyebrow">Follow-ups</p><div className="metric">{followUps}/3</div><p className="muted">This week</p></article>
            <article className="card"><p className="eyebrow">Interviews</p><div className="metric">{interviews}/1</div><p className="muted">Weekly target</p></article>
                        <article className="card"><p className="eyebrow">Application rate</p><div className="metric">{stats.applicationRate}%</div><p className="muted">Tracked roles progressed</p></article>
            <article className="card"><p className="eyebrow">Outreach due</p><div className="metric">{outreachDue}</div><p className="muted">Follow up today</p></article>
            <article className="card"><p className="eyebrow">Interview prep</p><div className="metric">{interviewPrepDue}</div><p className="muted">Within 72 hours</p></article>
            <article className="card"><p className="eyebrow">Offer decisions</p><div className="metric">{offerDeadlines}</div><p className="muted">Open deadlines</p></article>
            <article className="card"><p className="eyebrow">New sponsor roles</p><Link className="button secondary" href="/stamp4/simple-apply/sources-alerts">Review feed</Link><p className="muted">Ireland and target EU tiers</p></article>
          </div>
          {actions.length === 0 ? <p className="notice success">Queue clear. Use Job Sources &amp; Alerts to find the next strong role.</p> : (
            <div className="stack compact-stack">
              {actions.slice(0, 7).map(({ job, action }, index) => (
                <article className="notice stack compact-stack" key={job.id}>
                  <div className="toolbar">
                    <div>
                      <span className={'badge ' + (index === 0 ? 'high' : action.label.includes('follow') ? 'medium' : 'ok')}>#{index + 1} {action.label}</span>
                      <h3>{job.roleTitle} · {job.company}</h3>
                      <p className="muted">{action.why}</p>
                    </div>
                    <div className="source-actions">
                      {job.applicationUrl && <a className="button secondary" href={job.applicationUrl} target="_blank" rel="noreferrer">Open application</a>}
                      {job.status === 'Interview' && <Link className="button" href="/stamp4/simple-apply/interview-prep">Open prep</Link>}
                      {action.nextStatus && <button className="button" type="button" disabled={updatingId === job.id} onClick={() => advance(job, action.nextStatus!)}>{updatingId === job.id ? 'Saving...' : 'Mark ' + action.nextStatus}</button>}
                    </div>
                  </div>
                  <div className="grid two-grid">
                    <label className="stack compact-stack">
                      <span className="eyebrow">Application link</span>
                      <input className="input" type="url" defaultValue={job.applicationUrl ?? ''} placeholder="https://company.com/jobs/..." onBlur={(event) => void savePlanning(job, event.target.value, job.applicationDeadline ?? '')} />
                    </label>
                    <label className="stack compact-stack">
                      <span className="eyebrow">Deadline</span>
                      <input className="input" type="date" defaultValue={job.applicationDeadline ?? ''} onBlur={(event) => void savePlanning(job, job.applicationUrl ?? '', event.target.value)} />
                    </label>
                  </div>
                </article>
              ))}
            </div>
          )}
        </>
      )}
    </section>
  )
}