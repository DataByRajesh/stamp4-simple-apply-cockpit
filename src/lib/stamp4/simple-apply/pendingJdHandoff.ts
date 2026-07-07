const PENDING_JD_KEY = 'stamp4_pending_jd'

/** Hands a JD's raw text off to the Cockpit page via sessionStorage (same-origin, survives client navigation). */
export function savePendingJd(rawText: string): void {
  sessionStorage.setItem(PENDING_JD_KEY, rawText)
}

/** Reads and clears the pending JD, if any - one-shot so revisiting the Cockpit later doesn't re-trigger it. */
export function takePendingJd(): string | null {
  const rawText = sessionStorage.getItem(PENDING_JD_KEY)
  if (rawText !== null) sessionStorage.removeItem(PENDING_JD_KEY)
  return rawText
}
