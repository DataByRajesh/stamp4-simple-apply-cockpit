import * as XLSX from 'xlsx'

// Official DETE (enterprise.gov.ie) "Employment permits issued to companies" spreadsheet -
// direct government download, not scraped. Filename includes the year and is a cumulative
// snapshot for that year to date, published/updated monthly. Sheet layout confirmed by
// inspection: row 0 is a header ("Employer Name", monthly permit-count columns, grand total);
// the last row is a "Total" footer row, not a company - both are excluded below.
function buildRegisterUrl(year: number): string {
  return `https://enterprise.gov.ie/en/publications/publication-files/employment-permits-issued-to-companies-${year}.xlsx`
}

export interface IrelandPermitEmployerRecord {
  name: string
  permitCount: number
}

// Full name + permit-count records from the same government spreadsheet, for use cases that
// need the actual permit volume (e.g. the scored permit-employer universe), not just the name
// list the verified-sponsor cross-check needs. The grand-total column is always the last one -
// its position shifts depending on how many months have been published so far in a
// year-to-date snapshot, so this reads by relative position, not a fixed index.
export async function fetchIrelandPermitEmployerRecords(
  year: number = new Date().getFullYear(),
): Promise<IrelandPermitEmployerRecord[]> {
  const response = await fetch(buildRegisterUrl(year))
  if (!response.ok) throw new Error(`Ireland permit register fetch failed: ${response.status}`)

  const buffer = await response.arrayBuffer()
  const workbook = XLSX.read(buffer, { type: 'array' })
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1 })

  const records: IrelandPermitEmployerRecord[] = []
  const seen = new Set<string>()

  for (const row of rows.slice(1)) {
    const cell = row[0]
    if (typeof cell !== 'string') continue

    const name = cell.trim()
    if (!name || name.toLowerCase() === 'total' || seen.has(name)) continue

    const lastCell = row[row.length - 1]
    const permitCount = typeof lastCell === 'number' ? lastCell : Number(lastCell)
    if (!Number.isFinite(permitCount)) continue

    seen.add(name)
    records.push({ name, permitCount })
  }

  return records
}

export async function fetchIrelandVerifiedSponsorNames(year: number = new Date().getFullYear()): Promise<string[]> {
  const records = await fetchIrelandPermitEmployerRecords(year)
  return records.map((record) => record.name)
}

const LEGAL_SUFFIXES = /\b(unlimited company|limited|ltd|llp|plc|inc|co)\b\.?/gi

// Job-board company names are typically brand names ("Mastercard"); the government register
// uses full legal entity names ("Mastercard Payment Services (Ireland) Limited") - stripping
// common legal suffixes and punctuation, then checking substring containment either direction,
// catches this common case without a full fuzzy-string-distance algorithm.
export function normalizeCompanyName(name: string): string {
  return name
    .toLowerCase()
    .replace(LEGAL_SUFFIXES, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')
}

export function isVerifiedSponsor(companyName: string, verifiedNames: ReadonlySet<string>): boolean {
  const normalized = normalizeCompanyName(companyName)
  if (!normalized) return false

  for (const verifiedNormalized of verifiedNames) {
    if (normalized.includes(verifiedNormalized) || verifiedNormalized.includes(normalized)) return true
  }

  return false
}

export function buildNormalizedNameSet(names: readonly string[]): Set<string> {
  return new Set(names.map(normalizeCompanyName).filter(Boolean))
}
