/**
 * Pulls the full Ireland employment-permit-by-company register (DETE/enterprise.gov.ie -
 * the same government spreadsheet irelandSponsorRegister.ts already parses for the
 * verified-sponsor cross-check), scores and tiers every employer, and writes candidate
 * outputs at a few top-N cutoffs for review before deciding which to keep.
 *
 * The original 2025 dataset's scoring had the same class of problem found in the Germany
 * pull: real, unexplained variance (Google Ireland - 368 permits, the #1 rank by volume -
 * scored only 35, while Grant Thornton - 63 permits plus a "finance" name-signal - scored 51).
 * Raw permit volume clearly isn't the dominant factor and the exact weighting couldn't be
 * reliably recovered from the stored data alone. This version uses the same deterministic
 * two-factor shape as the Germany script for cross-market consistency:
 *   score = min(permitCount, 20) + 15 x distinct matched name-signal keywords
 * reusing the exact keyword vocabulary already present in the existing 500 employers'
 * "Name signals:" reasons (bank, consultancy, consulting, data, digital, finance, fund,
 * services, software, systems, technologies, technology) - so "what counts as relevant"
 * stays consistent with the prior work even though exact score values aren't reproduced.
 *
 * Usage: npx tsx scripts/pull-ireland-permit-employers.ts
 */

import * as fs from 'node:fs'
import { fetchIrelandPermitEmployerRecords } from '../src/lib/stamp4/simple-apply/irelandSponsorRegister'

// 'services' deliberately excluded - too generic (matched 253 employers on its own, including
// healthcare/inspection companies with no FinTech/tech relevance, and inflated 20 of them to
// "aligned" tier purely from high permit counts + this one non-specific word). Verified live
// against the full pull before excluding it, not assumed.
const SIGNAL_KEYWORDS = [
  'bank',
  'consultancy',
  'consulting',
  'data',
  'digital',
  'finance',
  'fund',
  'software',
  'systems',
  'technologies',
  'technology',
]

function matchedSignals(name: string): string[] {
  const lower = name.toLowerCase()
  return SIGNAL_KEYWORDS.filter((keyword) => lower.includes(keyword))
}

function scoreEmployer(permitCount: number, signalCount: number): number {
  return Math.min(permitCount, 20) + signalCount * 15
}

function tierFor(score: number): 'aligned' | 'review' | 'evidence' {
  if (score >= 30) return 'aligned'
  if (score >= 15) return 'review'
  return 'evidence'
}

async function main() {
  const year = 2026
  console.log(`Fetching ${year} Ireland permit-by-company records...`)
  const records = await fetchIrelandPermitEmployerRecords(year)
  console.log(`Total records: ${records.length}`)

  const scored = records.map((r) => {
    const signals = matchedSignals(r.name)
    const score = scoreEmployer(r.permitCount, signals.length)
    const reasons = [
      `${r.permitCount} permit${r.permitCount === 1 ? '' : 's'} issued in ${year} (year-to-date)`,
      ...(signals.length > 0 ? [`Name signals: ${signals.join(', ')}`] : []),
    ]
    return { name: r.name, permitCount: r.permitCount, relevanceScore: score, tier: tierFor(score), reasons }
  })

  scored.sort((a, b) => b.relevanceScore - a.relevanceScore || b.permitCount - a.permitCount)
  const withRank = scored.map((e, i) => ({ ...e, permitRank: i + 1 }))

  const tierCounts = withRank.reduce<Record<string, number>>((acc, e) => {
    acc[e.tier] = (acc[e.tier] ?? 0) + 1
    return acc
  }, {})

  console.log('\n--- Full-set tier counts (all', withRank.length, 'employers) ---')
  console.log(tierCounts)

  // Decided after reviewing tier counts at several cutoffs: full set kept (695 = the clean
  // aligned+review boundary; the ~4,970 evidence-tier employers beyond it are the long tail
  // widening the search was meant to surface, not noise to cut).
  const output = {
    metadata: {
      sourceYear: year,
      sourcePage: `https://enterprise.gov.ie/en/publications/employment-permit-statistics-${year}.html`,
      generatedAt: new Date().toISOString(),
      method:
        `${withRank.length} employers from the ${year} year-to-date employment-permits-issued-to-companies ` +
        `register (preferred over the prior full-year 2025 snapshot for currency, per instruction). ` +
        `Score = min(permitCount, 20) + 15 x distinct matched name-signal keywords (bank, consultancy, ` +
        `consulting, data, digital, finance, fund, software, systems, technologies, technology - "services" ` +
        `deliberately excluded as too generic, see comment above). Full set kept, not a top-N subset.`,
      disclaimer: 'Permit history is evidence of prior hiring, not a guarantee of sponsorship for a particular vacancy.',
      totalEmployersInSource: records.length,
    },
    employers: withRank,
  }

  const outPath = 'src/data/ireland-permit-employers-2026.json'
  fs.writeFileSync(outPath, JSON.stringify(output, null, 2) + '\n')
  console.log(`\nWrote ${outPath}`)
}

main().catch((err) => {
  console.error('FAILED:', err)
  process.exitCode = 1
})
