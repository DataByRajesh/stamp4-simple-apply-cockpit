import * as XLSX from 'xlsx'

// Official GOV.UK "Register of licensed sponsors: workers" - direct government download, not
// scraped from a third party. Unlike Ireland's register (a predictable per-year URL), the UK
// CSV's URL embeds a content hash and the publication date, and changes on close to a daily
// cadence (see the page's own update history) - so the download link has to be resolved from
// the publication page HTML on every fetch rather than built from a formula.
const REGISTER_PAGE_URL = 'https://www.gov.uk/government/publications/register-of-licensed-sponsors-workers'

async function resolveCurrentCsvUrl(): Promise<string> {
  const response = await fetch(REGISTER_PAGE_URL)
  if (!response.ok) throw new Error(`UK sponsor register page fetch failed: ${response.status}`)

  const html = await response.text()
  const match = html.match(/https:\/\/assets\.publishing\.service\.gov\.uk\/media\/[^"'\s]+?\.csv/)
  if (!match) throw new Error('Could not locate the current UK sponsor register CSV link on the GOV.UK page.')

  return match[0]
}

export interface UkSponsorRecord {
  name: string
  route: string
  rating: string
}

// The register lists every route a sponsor holds (Skilled Worker, Global Business Mobility,
// Temporary Worker, etc.) as separate rows for the same organisation. Skilled Worker is the
// only route relevant to a standard tech/analyst job search - the others (intra-company
// transfers, creative worker, ministers of religion, etc.) don't apply to an external
// candidate applying to a job posting.
const RELEVANT_ROUTE = 'Skilled Worker'

// Column headers confirmed by inspection of the live CSV: "Organisation Name", "Town/City",
// "County", "Type & Rating", "Route". SheetJS's XLSX.read parses CSV text directly (it
// auto-detects the format), so no separate CSV-parsing dependency is needed - the same
// approach irelandSponsorRegister.ts uses for the Ireland .xlsx register.
export async function fetchUkSkilledWorkerSponsorRecords(): Promise<UkSponsorRecord[]> {
  const csvUrl = await resolveCurrentCsvUrl()
  const response = await fetch(csvUrl)
  if (!response.ok) throw new Error(`UK sponsor register CSV fetch failed: ${response.status}`)

  const csvText = await response.text()
  const workbook = XLSX.read(csvText, { type: 'string' })
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet)

  const records: UkSponsorRecord[] = []
  const seen = new Set<string>()

  for (const row of rows) {
    const name = typeof row['Organisation Name'] === 'string' ? row['Organisation Name'].trim() : ''
    const route = typeof row['Route'] === 'string' ? row['Route'].trim() : ''
    if (!name || route !== RELEVANT_ROUTE) continue

    const key = name.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)

    const rating = typeof row['Type & Rating'] === 'string' ? row['Type & Rating'].trim() : ''
    records.push({ name, route, rating })
  }

  return records
}

export async function fetchUkVerifiedSponsorNames(): Promise<string[]> {
  const records = await fetchUkSkilledWorkerSponsorRecords()
  return records.map((record) => record.name)
}
