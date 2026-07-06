import type { BackupPayload, TrackedJob, TrackerStatus } from './types'

const STAMP4_SECRET = process.env.NEXT_PUBLIC_STAMP4_ACCESS_SECRET ?? ''

export async function apiCall<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`/api/stamp4/simple-apply/${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'x-stamp4-secret': STAMP4_SECRET,
      ...options.headers,
    },
  })

  if (!response.ok) {
    throw new Error(`Stamp4 API call failed: ${response.status}`)
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
