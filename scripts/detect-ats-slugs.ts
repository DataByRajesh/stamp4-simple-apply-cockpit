/**
 * Probes Greenhouse, Lever, and Ashby's public job-board APIs to auto-detect
 * a working atsProvider + atsSlug for companies that don't have one yet.
 *
 * Usage: npx tsx scripts/detect-ats-slugs.ts
 */

import { SPONSOR_COMPANIES } from '../src/lib/stamp4/simple-apply/sponsorCompanies'

interface DetectionResult {
  company: string
  provider: 'greenhouse' | 'lever' | 'ashby'
  slug: string
  jobCount: number
}

// Common slug variants to try per company. Add more as you learn them.
function candidateSlugs(name: string): string[] {
  const base = name
    .toLowerCase()
    .replace(/\s*\([^)]*\)/g, '') // strip "(Allied Irish Banks)" etc.
    .replace(/\s+(ireland|netherlands)$/i, '') // strip country suffix
    .trim()

  const noSpaces = base.replace(/\s+/g, '')
  const dashed = base.replace(/\s+/g, '-')
  const noSpecial = base.replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, '')

  return Array.from(new Set([noSpaces, dashed, noSpecial, base.split(' ')[0]]))
}

async function tryGreenhouse(slug: string): Promise<number | null> {
  try {
    const res = await fetch(`https://boards-api.greenhouse.io/v1/boards/${slug}/jobs`)
    if (!res.ok) return null
    const data = await res.json()
    return Array.isArray(data.jobs) ? data.jobs.length : null
  } catch {
    return null
  }
}

async function tryLever(slug: string): Promise<number | null> {
  try {
    const res = await fetch(`https://api.lever.co/v0/postings/${slug}?mode=json`)
    if (!res.ok) return null
    const data = await res.json()
    return Array.isArray(data) ? data.length : null
  } catch {
    return null
  }
}

async function tryAshby(slug: string): Promise<number | null> {
  try {
    const res = await fetch(`https://api.ashbyhq.com/posting-api/job-board/${slug}`)
    if (!res.ok) return null
    const data = await res.json()
    return Array.isArray(data.jobs) ? data.jobs.length : null
  } catch {
    return null
  }
}

async function detectCompany(name: string): Promise<DetectionResult | null> {
  const slugs = candidateSlugs(name)

  for (const slug of slugs) {
    const [gh, lever, ashby] = await Promise.all([tryGreenhouse(slug), tryLever(slug), tryAshby(slug)])

    if (gh !== null) return { company: name, provider: 'greenhouse', slug, jobCount: gh }
    if (lever !== null) return { company: name, provider: 'lever', slug, jobCount: lever }
    if (ashby !== null) return { company: name, provider: 'ashby', slug, jobCount: ashby }
  }

  return null
}

async function main() {
  const notPollable = SPONSOR_COMPANIES.filter((c) => !(c.atsProvider && c.atsSlug))

  console.log(`Checking ${notPollable.length} companies without a confirmed ATS slug...\n`)

  const found: DetectionResult[] = []
  const stillMissing: string[] = []

  // Sequential with a small delay to be polite to these free public APIs.
  for (const company of notPollable) {
    const result = await detectCompany(company.name)
    if (result) {
      found.push(result)
      console.log(`OK ${result.company} -> ${result.provider}/${result.slug} (${result.jobCount} jobs)`)
    } else {
      stillMissing.push(company.name)
      console.log(`MISS ${company.name} -> no match`)
    }
    await new Promise((r) => setTimeout(r, 300))
  }

  console.log('\n--- Summary ---')
  console.log(`Detected: ${found.length}/${notPollable.length}`)
  console.log('\nStill missing (manual check needed, likely Workday/SmartRecruiters/custom career sites):')
  stillMissing.forEach((name) => console.log(`  - ${name}`))

  console.log('\n--- Paste-ready updates for sponsorCompanies.ts ---')
  found.forEach((r) => {
    console.log(`  // ${r.company}: atsProvider: '${r.provider}', atsSlug: '${r.slug}',`)
  })
}

main().catch(console.error)

