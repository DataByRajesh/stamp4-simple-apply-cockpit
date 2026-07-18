import type { ApplicationRecord, BackupPayload, InterviewExecution, OfferDecision, OutreachDetails, TrackedJob, TrackerStatus } from './types'

export async function apiCall<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`/api/stamp4/simple-apply/${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })

  if (!response.ok) {
    if (response.status === 401 && typeof window !== 'undefined') window.location.assign('/stamp4/login')
    const body = await response.json().catch(() => null) as { error?: string } | null
    throw new Error(body?.error ?? `Stamp4 API call failed: ${response.status}`)
  }

  return response.json() as Promise<T>
}

export async function saveJobToTracker(job: TrackedJob): Promise<void> {
  await apiCall<{ ok: true }>('tracker', { method: 'POST', body: JSON.stringify(job) })
}

export async function getAllTrackedJobs(): Promise<TrackedJob[]> {
  return apiCall<TrackedJob[]>('tracker', { method: 'GET' })
}

export async function updateJobStatus(id: string, status: TrackerStatus): Promise<void> {
  await apiCall<{ ok: true }>('tracker', { method: 'PATCH', body: JSON.stringify({ id, status }) })
}

export async function updateJobPlanning(id: string, applicationUrl: string, applicationDeadline: string): Promise<void> {
  await apiCall<{ ok: true }>('tracker', { method: 'PATCH', body: JSON.stringify({ id, applicationUrl, applicationDeadline }) })
}


export async function updateSponsorship(id: string, sponsorshipStatus: import('./types').SponsorshipStatus, sponsorshipEvidence: string): Promise<void> {
  await apiCall<{ ok: true }>('tracker', { method: 'PATCH', body: JSON.stringify({ id, sponsorshipStatus, sponsorshipEvidence }) })
}
export async function updateOutreach(id: string, outreach: OutreachDetails): Promise<void> {
  await apiCall<{ ok: true }>('tracker', { method: 'PATCH', body: JSON.stringify({ id, outreach }) })
}

export async function updateApplicationRecord(id: string, applicationRecord: ApplicationRecord): Promise<void> {
  await apiCall<{ ok: true }>('tracker', { method: 'PATCH', body: JSON.stringify({ id, applicationRecord }) })
}
export async function updateInterviewExecution(id: string, interviewExecution: InterviewExecution): Promise<void> {
  await apiCall<{ ok: true }>('tracker', { method: 'PATCH', body: JSON.stringify({ id, interviewExecution }) })
}
export async function updateOfferDecision(id: string, offerDecision: OfferDecision): Promise<void> {
  await apiCall<{ ok: true }>('tracker', { method: 'PATCH', body: JSON.stringify({ id, offerDecision }) })
}
export async function deleteJobFromTracker(id: string): Promise<void> {
  await apiCall<{ ok: true }>(`tracker?id=${encodeURIComponent(id)}`, { method: 'DELETE' })
}

export async function updateJobNotes(id: string, notes: string): Promise<void> {
  await apiCall<{ ok: true }>('tracker', { method: 'PATCH', body: JSON.stringify({ id, notes }) })
}

export async function getAlertSetupStatus(): Promise<Record<string, boolean>> {
  return apiCall<Record<string, boolean>>('alerts', { method: 'GET' })
}

export async function setAlertSetupStatus(sourceName: string, done: boolean): Promise<void> {
  await apiCall<{ ok: true }>('alerts', { method: 'POST', body: JSON.stringify({ sourceName, done }) })
}

export async function exportBackup(): Promise<BackupPayload> {
  return apiCall<BackupPayload>('export', { method: 'GET' })
}

