import { NextResponse } from 'next/server'
import { fetchAdzunaJobs } from '@/lib/stamp4/simple-apply/adzunaFeed'
import { fetchArbeitnowVisaSponsorshipJobs } from '@/lib/stamp4/simple-apply/arbeitnowFeed'
import { type AggregatorJobPosting, fetchAtsJobs, matchesTargetRoles } from '@/lib/stamp4/simple-apply/atsFeeds'
import { sendSponsorAlertEmail, type SponsorAlertMatch } from '@/lib/stamp4/simple-apply/email'
import { buildNormalizedNameSet, isVerifiedSponsor } from '@/lib/stamp4/simple-apply/irelandSponsorRegister'
import { fetchJoobleJobs } from '@/lib/stamp4/simple-apply/joobleFeed'
import { RAJ_PROFILE } from '@/lib/stamp4/simple-apply/profile'
import { SPONSOR_COMPANIES, type AtsProvider } from '@/lib/stamp4/simple-apply/sponsorCompanies'
import { isEmailWorthyMatch, scorePosting } from '@/lib/stamp4/simple-apply/sponsorMatchScoring'
import { getSupabaseServer } from '@/lib/stamp4/simple-apply/supabaseServer'

export const runtime = 'nodejs'

type PollableCompany = {
  name: string
  atsProvider: AtsProvider
  atsSlug: string
}

type SponsorCompanyRow = {
  name: string
  ats_provider: AtsProvider | null
  ats_slug: string | null
}

type SeenPostingInsert = {
  company_name: string
  external_id: string
  title: string
  url: string
  location: string | null
  score_total: number
  decision: string
  description_text: string
  verified_sponsor?: boolean
}

// Shared by every aggregator feed (Arbeitnow, Adzuna): none of them are a curated sponsor-friendly
// watchlist, so an off-lane role has no other reason to be worth recording - filtered to the
// target role lane before scoring, rather than left to the email-worthy check alone. Each source
// gets its own external_id prefix so a coincidental id collision across sources/watchlist can't
// clobber a different posting in the shared seen_job_postings table.
function collectAggregatorMatches(
  jobs: AggregatorJobPosting[],
  sourcePrefix: string,
  candidateRows: SeenPostingInsert[],
  verifiedNames?: ReadonlySet<string>,
) {
  for (const job of jobs) {
    if (!matchesTargetRoles(job.title, RAJ_PROFILE.targetRoleLane)) continue

    const { score } = scorePosting(job.companyName, job.title, job.location, job.descriptionText)

    candidateRows.push({
      company_name: job.companyName,
      external_id: `${sourcePrefix}:${job.externalId}`,
      title: job.title,
      url: job.url,
      location: job.location,
      score_total: score.total,
      decision: score.decision,
      description_text: job.descriptionText,
      ...(verifiedNames ? { verified_sponsor: isVerifiedSponsor(job.companyName, verifiedNames) } : {}),
    })
  }
}

function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false

  return request.headers.get('authorization') === `Bearer ${secret}`
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const londonHour = Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', hour: '2-digit', hour12: false }).format(new Date()))
  if (londonHour !== 8) return NextResponse.json({ skipped: true, reason: 'Outside 08:00 Europe/London window' })

  const supabase = getSupabaseServer()

  const { data: customRows, error: customError } = await supabase
    .from('custom_sponsor_companies')
    .select('name, ats_provider, ats_slug')

  if (customError) {
    return NextResponse.json({ error: customError.message }, { status: 500 })
  }

  const allCompanies = [
    ...SPONSOR_COMPANIES.map((company) => ({
      name: company.name,
      atsProvider: company.atsProvider,
      atsSlug: company.atsSlug,
    })),
    ...((customRows ?? []) as SponsorCompanyRow[]).map((row) => ({
      name: row.name,
      atsProvider: row.ats_provider,
      atsSlug: row.ats_slug,
    })),
  ]

  const pollable: PollableCompany[] = allCompanies.filter(
    (company): company is PollableCompany => Boolean(company.atsProvider && company.atsSlug),
  )

  const candidateRows: SeenPostingInsert[] = []
  const checkedCompanies: string[] = []
  const failedCompanies: { name: string; error: string }[] = []

  for (const company of pollable) {
    try {
      const jobs = await fetchAtsJobs(company.atsProvider, company.atsSlug)
      checkedCompanies.push(company.name)

      for (const job of jobs) {
        const { score } = scorePosting(company.name, job.title, job.location, job.descriptionText)

        candidateRows.push({
          company_name: company.name,
          external_id: job.externalId,
          title: job.title,
          url: job.url,
          location: job.location,
          score_total: score.total,
          decision: score.decision,
          description_text: job.descriptionText,
        })
      }
    } catch (error) {
      failedCompanies.push({ name: company.name, error: error instanceof Error ? error.message : String(error) })
    }
  }

  try {
    const arbeitnowJobs = await fetchArbeitnowVisaSponsorshipJobs()
    checkedCompanies.push('Arbeitnow (Germany, visa-sponsorship filter)')
    collectAggregatorMatches(arbeitnowJobs, 'arbeitnow', candidateRows)
  } catch (error) {
    failedCompanies.push({ name: 'Arbeitnow', error: error instanceof Error ? error.message : String(error) })
  }

  // Adzuna's own `what` search is a genuine (if fuzzy) full-text match, unlike Arbeitnow's broken
  // `search` param - but role-lane filtering is still done client-side via
  // collectAggregatorMatches for one consistent precision check across every aggregator source,
  // rather than trusting each provider's own query semantics. Netherlands only: Adzuna does not
  // support Ireland at all, and Germany already has better, sponsorship-specific coverage via
  // Arbeitnow.
  try {
    const adzunaJobs = await fetchAdzunaJobs('nl', 'analyst')
    checkedCompanies.push('Adzuna (Netherlands)')
    collectAggregatorMatches(adzunaJobs, 'adzuna', candidateRows)
  } catch (error) {
    failedCompanies.push({ name: 'Adzuna', error: error instanceof Error ? error.message : String(error) })
  }

  // Jooble is the only aggregator confirmed to cover Ireland at all (Adzuna does not support it,
  // Arbeitnow is Germany/Austria/Switzerland only). Free tier is capped at 500 requests total, so
  // this stays to a single daily call rather than paginating.
  try {
    const { data: verifiedRows, error: verifiedError } = await supabase
      .from('ireland_verified_sponsors')
      .select('company_name')

    if (verifiedError) throw new Error(verifiedError.message)

    const irelandVerifiedNames = buildNormalizedNameSet(
      ((verifiedRows ?? []) as { company_name: string }[]).map((row) => row.company_name),
    )

    const joobleJobs = await fetchJoobleJobs('Ireland', 'analyst')
    checkedCompanies.push('Jooble (Ireland)')
    collectAggregatorMatches(joobleJobs, 'jooble', candidateRows, irelandVerifiedNames)
  } catch (error) {
    failedCompanies.push({ name: 'Jooble', error: error instanceof Error ? error.message : String(error) })
  }

  let newMatches: SponsorAlertMatch[] = []

  if (candidateRows.length > 0) {
    const { data: insertedRows, error: insertError } = await supabase
      .from('seen_job_postings')
      .upsert(candidateRows, { onConflict: 'company_name,external_id', ignoreDuplicates: true })
      .select('company_name, title, url, location, score_total, decision')

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    newMatches = (insertedRows ?? []).map((row) => ({
      companyName: row.company_name as string,
      title: row.title as string,
      url: row.url as string,
      location: row.location as string | null,
      scoreTotal: row.score_total as number,
      decision: row.decision as string,
    }))
  }

  // Non-target-lane and Skip-tier postings are recorded for transparency, but not worth an email.
  const emailWorthyMatches = newMatches.filter(
    (match) => isEmailWorthyMatch(match.decision, match.title, RAJ_PROFILE.targetRoleLane),
  )

  let emailed = false

  if (emailWorthyMatches.length > 0) {
    try {
      await sendSponsorAlertEmail(emailWorthyMatches)
      emailed = true
    } catch (error) {
      console.warn('Stamp4 sponsor alert email failed', error)
    }
  }

  const summary = {
    at: new Date().toISOString(),
    checkedCompanyCount: checkedCompanies.length,
    failedCompanyCount: failedCompanies.length,
    newMatchCount: newMatches.length,
    emailedMatchCount: emailWorthyMatches.length,
    emailed,
  }

  await supabase
    .from('app_settings')
    .upsert({ key: 'last_sponsor_poll', value: summary, updated_at: summary.at }, { onConflict: 'key' })

  return NextResponse.json({ ...summary, checkedCompanies, failedCompanies, newMatches })
}
