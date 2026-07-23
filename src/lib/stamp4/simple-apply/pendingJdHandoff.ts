const PENDING_JD_KEY = 'stamp4_pending_jd'

export interface PendingJdHandoff {
  rawText: string
  trackedJobId?: string
}

function hashTextToUuid(text: string): string {
  let h1 = 0xdeadbeef
  let h2 = 0x41c6ce57
  let h3 = 0xc0decafe
  let h4 = 0x9e3779b9

  for (let i = 0; i < text.length; i += 1) {
    const ch = text.charCodeAt(i)
    h1 = Math.imul(h1 ^ ch, 2654435761)
    h2 = Math.imul(h2 ^ ch, 1597334677)
    h3 = Math.imul(h3 ^ ch, 2246822507)
    h4 = Math.imul(h4 ^ ch, 3266489909)
  }

  const hex = [h1, h2, h3, h4].map((hash) => (hash >>> 0).toString(16).padStart(8, '0')).join('')
  const variant = ((parseInt(hex.slice(16, 18), 16) & 0x3f) | 0x80).toString(16).padStart(2, '0')

  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-5${hex.slice(13, 16)}-${variant}${hex.slice(18, 20)}-${hex.slice(20, 32)}`
}

export function seenPostingTrackedJobId(companyName: string, externalId: string): string {
  const normalizedCompany = companyName.trim().toLowerCase()
  return hashTextToUuid(`seen_job_postings:${normalizedCompany}:${externalId}`)
}

/** Hands a JD's raw text off to the Cockpit page via sessionStorage (same-origin, survives client navigation). */
export function savePendingJd(rawText: string, trackedJobId?: string): void {
  sessionStorage.setItem(PENDING_JD_KEY, JSON.stringify({ rawText, trackedJobId }))
}

/** Reads and clears the pending JD, if any - one-shot so revisiting the Cockpit later doesn't re-trigger it. */
export function takePendingJd(): PendingJdHandoff | null {
  const value = sessionStorage.getItem(PENDING_JD_KEY)
  if (value !== null) sessionStorage.removeItem(PENDING_JD_KEY)
  if (value === null) return null

  try {
    const parsed = JSON.parse(value) as PendingJdHandoff
    return typeof parsed.rawText === 'string' ? parsed : { rawText: value }
  } catch {
    return { rawText: value }
  }
}

/**
 * Resolves a JD handoff from either source: the same-origin sessionStorage handoff (used by the
 * "Send to Cockpit" action elsewhere in the app) takes priority since it's synchronous and
 * already available; otherwise, a ?captureToken= from the browser extension is fetched from the
 * one-shot /api/stamp4/simple-apply/capture endpoint. The captureToken is stripped from the URL
 * either way (found-and-consumed or not-found) so a refresh never re-triggers or re-errors.
 */
export async function resolvePendingJd(): Promise<PendingJdHandoff | null> {
  const sessionHandoff = takePendingJd()
  if (sessionHandoff) return sessionHandoff

  const url = new URL(window.location.href)
  const token = url.searchParams.get('captureToken')
  if (!token) return null

  url.searchParams.delete('captureToken')
  window.history.replaceState({}, '', url.toString())

  try {
    const response = await fetch(`/api/stamp4/simple-apply/capture?token=${encodeURIComponent(token)}`)
    if (!response.ok) return null
    const data = (await response.json()) as { rawText: string }
    return typeof data.rawText === 'string' ? { rawText: data.rawText } : null
  } catch {
    return null
  }
}
