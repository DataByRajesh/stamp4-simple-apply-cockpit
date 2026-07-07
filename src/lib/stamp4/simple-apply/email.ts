export interface SponsorAlertMatch {
  companyName: string
  title: string
  url: string
  location: string | null
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => {
    switch (char) {
      case '&':
        return '&amp;'
      case '<':
        return '&lt;'
      case '>':
        return '&gt;'
      case '"':
        return '&quot;'
      default:
        return '&#39;'
    }
  })
}

function buildDigestHtml(matches: SponsorAlertMatch[]): string {
  const items = matches
    .map(
      (match) =>
        `<li><strong>${escapeHtml(match.companyName)}</strong> - <a href="${escapeHtml(match.url)}">${escapeHtml(match.title)}</a>${match.location ? ` (${escapeHtml(match.location)})` : ''}</li>`,
    )
    .join('')

  return `<p>New roles matching your target lane were just posted by sponsor-friendly companies on your Stamp4 watchlist:</p><ul>${items}</ul>`
}

export async function sendSponsorAlertEmail(matches: SponsorAlertMatch[]): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY
  const to = process.env.STAMP4_ALERT_EMAIL_TO
  const from = process.env.STAMP4_ALERT_EMAIL_FROM

  if (!apiKey || !to || !from) {
    throw new Error('Resend is not configured. Set RESEND_API_KEY, STAMP4_ALERT_EMAIL_TO and STAMP4_ALERT_EMAIL_FROM.')
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to,
      subject: `Stamp4: ${matches.length} new sponsor-company role${matches.length === 1 ? '' : 's'} found`,
      html: buildDigestHtml(matches),
    }),
  })

  if (!response.ok) {
    throw new Error(`Resend request failed with ${response.status}: ${await response.text()}`)
  }
}
