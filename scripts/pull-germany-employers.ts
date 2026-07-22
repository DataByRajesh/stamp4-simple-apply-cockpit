/**
 * Pulls current job listings from the Bundesagentur für Arbeit (Federal Employment Agency)
 * Jobsuche API (https://jobsuche.api.bund.dev/ - community-documented, public
 * X-API-Key: jobboerse-jobsuche) across role-relevant search categories, aggregates by
 * employer, excludes staffing agencies, scores and tiers each employer under a deterministic
 * formula, and writes the result to src/data/germany-target-employers-2026-07.json in the
 * exact GermanyEmployer shape (germanyEmployers.ts).
 *
 * The original dataset's scoring included an unexplained factor that could not be reliably
 * reverse-engineered from the stored data alone (real variance found holding role-count and
 * signal-keyword-count constant) - see docs/decisions/2026-07-applywave-comparison.md context
 * and the conversation that produced this script. This version uses a fully deterministic,
 * two-factor formula instead: role count + matched role-signal keywords, no subjective
 * "known employer" bonus.
 *
 * Usage: npx tsx scripts/pull-germany-employers.ts
 */

import * as fs from 'node:fs'
import { RAJ_PROFILE } from '../src/lib/stamp4/simple-apply/profile'

const API_BASE = 'https://rest.arbeitsagentur.de/jobboerse/jobsuche-service/pc/v4/jobs'
const API_KEY = 'jobboerse-jobsuche'
const PAGE_SIZE = 100
const MAX_PAGES_PER_TERM = 20 // safety cap - 2000 jobs/term ceiling, well above any term seen so far

// Matches the six categories the original dataset was built from - systems, application,
// business/data analysis, ERP, product, IT project - in both English and German, since German
// job-market postings are frequently in German.
const SEARCH_TERMS = [
  'Systemanalyst',
  'Anwendungsanalyst',
  'Business Analyst',
  'Data Analyst',
  'Geschäftsprozessanalyst',
  'ERP Consultant',
  'ERP Berater',
  'Product Owner',
  'Produktmanager',
  'IT Projektmanager',
  'IT Project Manager',
]

// Objective role-relevance keywords - reuses the app's own target + adjacent role lane
// definitions (profile.ts) plus German equivalents for the same concepts, so "relevant" means
// the same thing here as everywhere else scoring happens in this app.
const SIGNAL_KEYWORDS = [
  ...RAJ_PROFILE.targetRoleLane,
  ...RAJ_PROFILE.adjacentRoleLane,
  'systemanalyst',
  'anwendungsanalyst',
  'geschäftsprozess',
  'wirtschaftsinformatik',
  'erp',
  'sap',
  'produktmanager',
  'product owner',
  'projektmanager',
  'project manager',
  'it-projekt',
]

const STAFFING_AGENCY_MARKERS = ['zeitarbeit', 'personaldienstleist', 'personalvermittlung', 'leasing personal']

interface BAJob {
  refnr: string
  titel?: string
  arbeitgeber?: string
  arbeitsort?: { ort?: string }
  aktuelleVeroeffentlichungsdatum?: string
}

interface BAResponse {
  stellenangebote?: BAJob[]
  maxErgebnisse?: number
}

async function fetchAllPages(was: string): Promise<BAJob[]> {
  const results: BAJob[] = []

  for (let page = 1; page <= MAX_PAGES_PER_TERM; page += 1) {
    const params = new URLSearchParams({
      was,
      angebotsart: '1',
      zeitarbeit: 'false',
      pav: 'false',
      page: String(page),
      size: String(PAGE_SIZE),
    })

    const res = await fetch(`${API_BASE}?${params.toString()}`, { headers: { 'X-API-Key': API_KEY } })
    if (!res.ok) {
      console.warn(`  "${was}" page ${page}: HTTP ${res.status}`)
      break
    }

    const data = (await res.json()) as BAResponse
    const jobs = data.stellenangebote ?? []
    results.push(...jobs)

    if (jobs.length < PAGE_SIZE || results.length >= (data.maxErgebnisse ?? 0)) break
    await new Promise((r) => setTimeout(r, 200)) // polite delay between pages
  }

  return results
}

function matchedSignals(title: string | undefined): string[] {
  if (!title) return []
  const lower = title.toLowerCase()
  return SIGNAL_KEYWORDS.filter((keyword) => lower.includes(keyword.toLowerCase()))
}

function isStaffingAgency(name: string): boolean {
  const lower = name.toLowerCase()
  return STAFFING_AGENCY_MARKERS.some((marker) => lower.includes(marker))
}

// Deterministic, fully-documented score: 1 point per current active role (capped at 20) + 10
// points per distinct matched role-signal keyword across all of that employer's titles
// (uncapped in practice - realistically tops out around 5-6 distinct keywords).
function scoreEmployer(roleCount: number, signalCount: number): number {
  return Math.min(roleCount, 20) + signalCount * 10
}

function tierFor(score: number): 'aligned' | 'review' | 'evidence' {
  if (score >= 40) return 'aligned'
  if (score >= 20) return 'review'
  return 'evidence'
}

interface EmployerAccumulator {
  displayName: string
  titles: Set<string>
  locations: Set<string>
  refs: string[]
  latest: string
  signals: Set<string>
}

async function main() {
  const byEmployer = new Map<string, EmployerAccumulator>()
  let totalJobsSeen = 0

  for (const term of SEARCH_TERMS) {
    process.stdout.write(`Searching "${term}"... `)
    const jobs = await fetchAllPages(term)
    totalJobsSeen += jobs.length
    console.log(`${jobs.length} jobs`)

    for (const job of jobs) {
      if (!job.arbeitgeber || isStaffingAgency(job.arbeitgeber)) continue

      const title = job.titel
      if (!title) continue

      const signals = matchedSignals(title)
      if (signals.length === 0) continue // title must actually match a relevant keyword

      // Grouped case-insensitively - the BA's own data has inconsistent capitalization for the
      // same employer across different postings (e.g. "IBC SOLAR AG" vs "IBC Solar AG"),
      // verified directly by inspecting duplicate groups in an earlier run of this script.
      // The first-seen casing is kept as the canonical display name.
      const displayName = job.arbeitgeber.trim()
      const key = displayName.toLowerCase()
      const entry: EmployerAccumulator = byEmployer.get(key) ?? {
        displayName,
        titles: new Set(),
        locations: new Set(),
        refs: [],
        latest: '',
        signals: new Set(),
      }

      entry.titles.add(title)
      if (job.arbeitsort?.ort) entry.locations.add(job.arbeitsort.ort)
      if (!entry.refs.includes(job.refnr)) entry.refs.push(job.refnr)
      signals.forEach((s) => entry.signals.add(s))
      if (job.aktuelleVeroeffentlichungsdatum && job.aktuelleVeroeffentlichungsdatum > entry.latest) {
        entry.latest = job.aktuelleVeroeffentlichungsdatum
      }

      byEmployer.set(key, entry)
    }

    await new Promise((r) => setTimeout(r, 300)) // polite delay between search terms
  }

  const employers = [...byEmployer.entries()].map(([, e]) => {
    const name = e.displayName
    const roleCount = e.refs.length
    const score = scoreEmployer(roleCount, e.signals.size)
    const reasons = [
      `${roleCount} current targeted BA role${roleCount === 1 ? '' : 's'}`,
      ...(e.signals.size > 0 ? [`Role signals: ${[...e.signals].slice(0, 5).join(', ')}`] : []),
    ]

    return {
      name,
      activeRoleCount: roleCount,
      titles: [...e.titles].slice(0, 10),
      locations: [...e.locations],
      sourceRefs: e.refs,
      latestPublished: e.latest,
      relevanceScore: score,
      tier: tierFor(score),
      reasons,
      relevanceRank: 0, // filled after sorting
    }
  })

  employers.sort((a, b) => b.relevanceScore - a.relevanceScore)
  employers.forEach((e, i) => {
    e.relevanceRank = i + 1
  })

  const tierCounts = employers.reduce<Record<string, number>>((acc, e) => {
    acc[e.tier] = (acc[e.tier] ?? 0) + 1
    return acc
  }, {})

  console.log('\n--- Results ---')
  console.log('Total jobs analysed (pre-filter, all search terms):', totalJobsSeen)
  console.log('Total employers after exclusions/filtering:', employers.length)
  console.log('Tier counts:', tierCounts)

  const output = {
    metadata: {
      country: 'Germany',
      snapshotDate: new Date().toISOString().slice(0, 10),
      sourcePage: 'https://www.make-it-in-germany.com/en/working-in-germany/job-listings',
      blueCardSource: 'https://www.make-it-in-germany.com/en/visa-residence/types/eu-blue-card',
      blueCardGeneralSalary2026: 50700,
      blueCardReducedSalary2026: 45934.2,
      method:
        `${employers.length} role-relevant employers aggregated from Bundesagentur für Arbeit Jobsuche API ` +
        `listings across systems, application, business/data analysis, ERP, product and IT project searches ` +
        `(English + German terms); staffing agencies excluded by name-marker matching. ` +
        `Score = min(activeRoleCount, 20) + 10 x distinct matched role-signal keywords.`,
      disclaimer:
        'A current BA vacancy is hiring evidence, not a sponsorship promise. Confirm language, salary, ' +
        'qualification match and visa support on each vacancy.',
      jobsAnalysed: totalJobsSeen,
      employersAfterExclusions: employers.length,
    },
    employers,
  }

  const outPath = 'src/data/germany-target-employers-2026-07.json'
  fs.writeFileSync(outPath, JSON.stringify(output, null, 2) + '\n')
  console.log(`\nWrote ${outPath}`)
}

main().catch(console.error)
