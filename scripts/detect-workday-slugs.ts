/**
 * Probes Workday's public CXS job-search API using common tenant naming patterns.
 * Workday career sites are hosted at:
 *   https://<tenant>.wd1.myworkdayjobs.com/wday/cxs/<tenant>/<site>/jobs
 * <site> is usually "External", "Careers", or the company name itself - this varies
 * per company, so we try several. wd1-wd5 also vary by which Workday data centre
 * the tenant is on, so we try the common ones.
 *
 * Usage: npx tsx scripts/detect-workday-slugs.ts
 */

import { SPONSOR_COMPANIES } from '../src/lib/stamp4/simple-apply/sponsorCompanies'

interface WorkdayResult {
  company: string
  tenant: string
  dataCenter: string
  site: string
  jobCount: number
  url: string
}

const DATA_CENTERS = ['wd1', 'wd3', 'wd5']
const SITE_NAMES = ['External', 'Careers', 'ExternalCareerSite', 'GlobalCareers']

function candidateTenants(name: string): string[] {
  const base = name
    .toLowerCase()
    .replace(/\s*\([^)]*\)/g, '')
    .replace(/\s+(ireland|netherlands)$/i, '')
    .trim()

  const noSpaces = base.replace(/\s+/g, '')
  const dashed = base.replace(/\s+/g, '-')
  const firstWord = base.split(' ')[0]

  return Array.from(new Set([noSpaces, dashed, firstWord]))
}

async function tryWorkdayTenant(
  tenant: string,
  dataCenter: string,
  site: string,
): Promise<{ jobCount: number; url: string } | null> {
  const baseUrl = `https://${tenant}.${dataCenter}.myworkdayjobs.com/wday/cxs/${tenant}/${site}/jobs`

  try {
    const res = await fetch(baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ appliedFacets: {}, limit: 1, offset: 0, searchText: '' }),
    })
    if (!res.ok) return null

    const data = await res.json()
    if (typeof data.total !== 'number') return null

    return { jobCount: data.total, url: baseUrl }
  } catch {
    return null
  }
}

async function detectCompany(name: string): Promise<WorkdayResult | null> {
  const tenants = candidateTenants(name)

  for (const tenant of tenants) {
    for (const dataCenter of DATA_CENTERS) {
      for (const site of SITE_NAMES) {
        const result = await tryWorkdayTenant(tenant, dataCenter, site)
        if (result) {
          return { company: name, tenant, dataCenter, site, jobCount: result.jobCount, url: result.url }
        }
        await new Promise((r) => setTimeout(r, 150))
      }
    }
  }

  return null
}

async function main() {
  const notPollable = SPONSOR_COMPANIES.filter((c) => !(c.atsProvider && c.atsSlug))

  console.log(`Checking ${notPollable.length} companies for Workday tenants...`)
  console.log(`(This tries up to ${DATA_CENTERS.length * SITE_NAMES.length} combos per tenant name, so it's slower - be patient)\n`)

  const found: WorkdayResult[] = []
  const stillMissing: string[] = []

  for (const company of notPollable) {
    const result = await detectCompany(company.name)
    if (result) {
      found.push(result)
      console.log(`OK ${result.company} -> ${result.tenant}.${result.dataCenter} / ${result.site} (${result.jobCount} jobs)`)
      console.log(`   ${result.url}`)
    } else {
      stillMissing.push(company.name)
      console.log(`MISS ${company.name} -> no Workday tenant found`)
    }
  }

  console.log('\n--- Summary ---')
  console.log(`Detected: ${found.length}/${notPollable.length}`)
  console.log('\nStill missing after Greenhouse/Lever/Ashby + Workday:')
  stillMissing.forEach((name) => console.log(`  - ${name}`))

  console.log('\n--- Raw findings (verify manually before adding to sponsorCompanies.ts) ---')
  found.forEach((r) => {
    console.log(`  ${r.company}: tenant=${r.tenant}, dataCenter=${r.dataCenter}, site=${r.site}, jobs=${r.jobCount}`)
  })
}

main().catch(console.error)

