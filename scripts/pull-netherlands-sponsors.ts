/** Pull and rank IND-recognised work sponsors. Usage: npx tsx scripts/pull-netherlands-sponsors.ts [--dry-run] */
import * as fs from 'node:fs'
import * as path from 'node:path'
import { fetchAdzunaJobs } from '../src/lib/stamp4/simple-apply/adzunaFeed'
import { RAJ_PROFILE } from '../src/lib/stamp4/simple-apply/profile'

if (fs.existsSync('.env.local')) process.loadEnvFile('.env.local')

const REGISTER_URL = 'https://ind.nl/en/public-register-recognised-sponsors/public-register-work'
const EXPECTED_ROW_RANGE = { min: 10_000, max: 20_000 }
const ALIGNED_SCORE_MINIMUM = 12
const REVIEW_SCORE_MINIMUM = 10
const DRY_RUN = process.argv.includes('--dry-run')
const SIGNAL_KEYWORDS = [...RAJ_PROFILE.targetRoleLane, ...RAJ_PROFILE.adjacentRoleLane]

interface RawSponsor { name: string; kvkNumber: string }

function decodeHtmlEntities(value: string): string {
  const named: Record<string, string> = { amp: '&', apos: "'", gt: '>', lt: '<', nbsp: ' ', quot: '"' }
  return value
    .replace(/&([a-z]+);/gi, (match, name: string) => named[name.toLowerCase()] ?? match)
    .replace(/&#(\d+);/g, (_match, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&#x([\da-f]+);/gi, (_match, code: string) => String.fromCodePoint(Number.parseInt(code, 16)))
}

function parseRegisterHtml(html: string): RawSponsor[] {
  const sponsors: RawSponsor[] = []
  // IND uses a row-header <th> for the organisation name and <td> for the KVK number.
  const pattern = /<tr[^>]*>\s*<(?:th|td)[^>]*>([\s\S]*?)<\/(?:th|td)>\s*<(?:th|td)[^>]*>([\s\S]*?)<\/(?:th|td)>\s*<\/tr>/gi
  let match: RegExpExecArray | null
  while ((match = pattern.exec(html)) !== null) {
    const name = decodeHtmlEntities(match[1].replace(/<[^>]+>/g, '')).trim()
    const kvkNumber = decodeHtmlEntities(match[2].replace(/<[^>]+>/g, '')).trim()
    if (name && /^\d{6,9}$/.test(kvkNumber)) sponsors.push({ name, kvkNumber })
  }
  return sponsors
}

function normalizeCompanyName(value: string): string {
  const tokens = value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, ' ').trim().split(/\s+/)
  const suffixes = [['cooperatief', 'u', 'a'], ['b', 'v'], ['n', 'v'], ['s', 'a'], ['gmbh'], ['limited'], ['ltd'], ['llp'], ['llc'], ['inc'], ['bv'], ['nv'], ['sa']]
  let removed = true
  while (removed && tokens.length) {
    removed = false
    for (const suffix of suffixes) {
      const start = tokens.length - suffix.length
      if (start >= 0 && suffix.every((token, index) => tokens[start + index] === token)) {
        tokens.splice(start, suffix.length); removed = true; break
      }
    }
  }
  return tokens.join(' ')
}

async function fetchRegister(): Promise<RawSponsor[]> {
  const response = await fetch(REGISTER_URL)
  if (!response.ok) throw new Error(`IND register fetch failed: HTTP ${response.status}`)
  const sponsors = parseRegisterHtml(await response.text())
  if (sponsors.length < EXPECTED_ROW_RANGE.min || sponsors.length > EXPECTED_ROW_RANGE.max) {
    throw new Error(`Parsed ${sponsors.length} sponsors, outside expected range ${EXPECTED_ROW_RANGE.min}-${EXPECTED_ROW_RANGE.max}; refusing to write output.`)
  }
  return sponsors
}

function matchedSignals(title: string): string[] {
  const lower = title.toLowerCase()
  return SIGNAL_KEYWORDS.filter((keyword) => lower.includes(keyword.toLowerCase()))
}

function tierFor(score: number): 'aligned' | 'review' | 'evidence' {
  return score >= ALIGNED_SCORE_MINIMUM ? 'aligned' : score >= REVIEW_SCORE_MINIMUM ? 'review' : 'evidence'
}

async function main() {
  console.log(`Fetching IND register...${DRY_RUN ? ' (dry run)' : ''}`)
  const rawSponsors = await fetchRegister()
  const sponsors = [...new Map(rawSponsors.map((item) => [item.kvkNumber, item])).values()]
  console.log(`Parsed ${rawSponsors.length} rows; ${sponsors.length} unique KVK numbers.`)
  console.log('First/last:', sponsors[0], sponsors.at(-1))
  if (DRY_RUN) return

  const jobsById = new Map<string, Awaited<ReturnType<typeof fetchAdzunaJobs>>[number]>()
  let fetchedJobCount = 0
  for (const query of SIGNAL_KEYWORDS) {
    const jobs = await fetchAdzunaJobs('nl', query)
    fetchedJobCount += jobs.length
    jobs.forEach((job) => jobsById.set(job.externalId, job))
  }
  const nlJobs = [...jobsById.values()]
  console.log(`Fetched ${fetchedJobCount} Adzuna results across ${SIGNAL_KEYWORDS.length} role terms; ${nlJobs.length} unique Netherlands postings.`)

  const jobsByEmployer = new Map<string, { count: number; signals: Set<string> }>()
  for (const job of nlJobs) {
    const key = normalizeCompanyName(job.companyName)
    if (!key) continue
    const entry = jobsByEmployer.get(key) ?? { count: 0, signals: new Set<string>() }
    entry.count += 1
    matchedSignals(job.title).forEach((signal) => entry.signals.add(signal))
    jobsByEmployer.set(key, entry)
  }

  const employers = sponsors.map((sponsor) => {
    const evidence = jobsByEmployer.get(normalizeCompanyName(sponsor.name))
    const activeRoles = evidence?.count ?? 0
    const signals = evidence ? [...evidence.signals] : []
    const relevanceScore = Math.min(activeRoles, 20) + signals.length * 10
    return {
      ...sponsor, relevanceRank: 0, relevanceScore, tier: tierFor(relevanceScore),
      reasons: activeRoles
        ? [`${activeRoles} current Netherlands Adzuna posting${activeRoles === 1 ? '' : 's'} matched by normalized name.`, ...(signals.length ? [`Role signals: ${signals.slice(0, 5).join(', ')}`] : [])]
        : ['Confirmed IND-recognised sponsor; no current matching Netherlands Adzuna posting found by normalized name match.'],
    }
  })
  employers.sort((a, b) => b.relevanceScore - a.relevanceScore || a.name.localeCompare(b.name))
  employers.forEach((employer, index) => { employer.relevanceRank = index + 1 })

  const output = { metadata: {
    country: 'Netherlands', registerUpdated: 'See the IND register page for its last-updated date at fetch time.',
    sourcePage: REGISTER_URL, generatedAt: new Date().toISOString(),
    method: `${sponsors.length} IND-recognised sponsors deduplicated by KVK and conservatively name-matched against Netherlands Adzuna postings fetched across ${SIGNAL_KEYWORDS.length} role terms. Score = min(active roles, 20) + 10 x distinct role signals; aligned >= ${ALIGNED_SCORE_MINIMUM}, review >= ${REVIEW_SCORE_MINIMUM}, otherwise evidence.`,
    disclaimer: 'IND recognition does not mean a specific vacancy offers sponsorship or is currently hiring. Confirm sponsorship intent, salary and role fit for each vacancy.',
    totalRecognisedSponsors: sponsors.length,
  }, employers }
  const directory = path.join('src', 'data')
  const stablePath = path.join(directory, 'netherlands-recognised-sponsors.json')
  const archivePath = path.join(directory, `netherlands-recognised-sponsors-${new Date().toISOString().slice(0, 10)}.json`)
  const json = `${JSON.stringify(output, null, 2)}\n`
  fs.mkdirSync(directory, { recursive: true })
  fs.writeFileSync(stablePath, json); fs.writeFileSync(archivePath, json)
  console.log(`Wrote ${stablePath}\nWrote ${archivePath}`)
}

main().catch((error: unknown) => { console.error('pull-netherlands-sponsors.ts failed:', error); process.exitCode = 1 })
