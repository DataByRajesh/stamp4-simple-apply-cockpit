import { NextResponse } from 'next/server'
import { fetchAdzunaJobs } from '@/lib/stamp4/simple-apply/adzunaFeed'
import { fetchArbeitnowVisaSponsorshipJobs } from '@/lib/stamp4/simple-apply/arbeitnowFeed'
import { type AggregatorJobPosting, type NormalizedJobPosting, fetchAtsJobs, matchesTargetRoles } from '@/lib/stamp4/simple-apply/atsFeeds'
import { listCareerSearchProfiles } from '@/lib/stamp4/simple-apply/careerSearchProfiles'
import { sendSponsorAlertEmail, type SponsorAlertMatch } from '@/lib/stamp4/simple-apply/email'
import { buildNormalizedNameSet, isVerifiedSponsor } from '@/lib/stamp4/simple-apply/irelandSponsorRegister'
import { fetchJoobleJobs } from '@/lib/stamp4/simple-apply/joobleFeed'
import type { CareerMobilityProfile } from '@/lib/stamp4/simple-apply/profile'
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
  user_id: string
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

type RawAtsJob = { companyName: string; job: NormalizedJobPosting }

function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false

  return request.headers.get('authorization') === `Bearer ${secret}`
}

/**
 * Scores one user's own subset of the shared, already-fetched raw postings
 * against their own CareerMobilityProfile, and returns rows ready to
 * upsert into seen_job_postings under their user_id. Aggregator jobs
 * (Arbeitnow/Adzuna/Jooble - an open firehose) are filtered to the user's
 * own target/adjacent role lane first, same as before this was per-user;
 * ATS-watchlist jobs are scored unconditionally, since that watchlist is
 * itself a curated "worth recording" list, not a raw feed to filter.
 */
function scoreForUser(
  profile: CareerMobilityProfile,
  atsRawJobs: RawAtsJob[],
  arbeitnowJobs: AggregatorJobPosting[],
  adzunaJobs: AggregatorJobPosting[],
  joobleJobs: AggregatorJobPosting[],
  irelandVerifiedNames: ReadonlySet<string>,
): Omit<SeenPostingInsert, 'user_id'>[] {
  const candidateRows: Omit<SeenPostingInsert, 'user_id'>[] = []
  const aggregatorRoleLane = [...profile.targetRoleLane, ...profile.adjacentRoleLane]

  for (const { companyName, job } of atsRawJobs) {
    const { score } = scorePosting(companyName, job.title, job.location, job.descriptionText, profile)
    candidateRows.push({
      company_name: companyName,
      external_id: job.externalId,
      title: job.title,
      url: job.url,
      location: job.location,
      score_total: score.total,
      decision: score.decision,
      description_text: job.descriptionText,
    })
  }

  const collect = (jobs: AggregatorJobPosting[], sourcePrefix: string, verifiedNames?: ReadonlySet<string>) => {
    for (const job of jobs) {
      if (!matchesTargetRoles(job.title, aggregatorRoleLane)) continue

      const { score } = scorePosting(job.companyName, job.title, job.location, job.descriptionText, profile)
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

  collect(arbeitnowJobs, 'arbeitnow')
  collect(adzunaJobs, 'adzuna')
  collect(joobleJobs, 'jooble', irelandVerifiedNames)

  return candidateRows
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const londonHour = Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', hour: '2-digit', hour12: false }).format(new Date()))
  if (londonHour !== 8) return NextResponse.json({ skipped: true, reason: 'Outside 08:00 Europe/London window' })

  const supabase = getSupabaseServer()

  const profiles = await listCareerSearchProfiles(supabase)
  if (profiles.length === 0) {
    return NextResponse.json({ skipped: true, reason: 'No career_search_profiles rows to poll for' })
  }

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

  // Fetched once, shared across every user below - re-fetching per user would multiply calls
  // against rate-limited free-tier aggregator APIs (Jooble's 500/day cap in particular) for no
  // benefit, since the raw postings are identical; only the scoring/filtering below is per-user.
  const atsRawJobs: RawAtsJob[] = []
  const checkedCompanies: string[] = []
  const failedCompanies: { name: string; error: string }[] = []

  for (const company of pollable) {
    try {
      const jobs = await fetchAtsJobs(company.atsProvider, company.atsSlug)
      checkedCompanies.push(company.name)
      for (const job of jobs) atsRawJobs.push({ companyName: company.name, job })
    } catch (error) {
      failedCompanies.push({ name: company.name, error: error instanceof Error ? error.message : String(error) })
    }
  }

  let arbeitnowJobs: AggregatorJobPosting[] = []
  try {
    arbeitnowJobs = await fetchArbeitnowVisaSponsorshipJobs()
    checkedCompanies.push('Arbeitnow (Germany, visa-sponsorship filter)')
  } catch (error) {
    failedCompanies.push({ name: 'Arbeitnow', error: error instanceof Error ? error.message : String(error) })
  }

  // Adzuna's own `what` search is a genuine (if fuzzy) full-text match, unlike Arbeitnow's broken
  // `search` param - but role-lane filtering is still done per-user for one consistent precision
  // check across every aggregator source, rather than trusting each provider's own query
  // semantics. Netherlands only: Adzuna does not support Ireland at all, and Germany already has
  // better, sponsorship-specific coverage via Arbeitnow.
  let adzunaJobs: AggregatorJobPosting[] = []
  try {
    adzunaJobs = await fetchAdzunaJobs('nl', 'analyst')
    checkedCompanies.push('Adzuna (Netherlands)')
  } catch (error) {
    failedCompanies.push({ name: 'Adzuna', error: error instanceof Error ? error.message : String(error) })
  }

  // Jooble is the only aggregator confirmed to cover Ireland at all (Adzuna does not support it,
  // Arbeitnow is Germany/Austria/Switzerland only). Free tier is capped at 500 requests total, so
  // this stays to a single daily call rather than paginating.
  let joobleJobs: AggregatorJobPosting[] = []
  let irelandVerifiedNames: ReadonlySet<string> = new Set()
  try {
    const { data: verifiedRows, error: verifiedError } = await supabase
      .from('ireland_verified_sponsors')
      .select('company_name')

    if (verifiedError) throw new Error(verifiedError.message)

    irelandVerifiedNames = buildNormalizedNameSet(
      ((verifiedRows ?? []) as { company_name: string }[]).map((row) => row.company_name),
    )

    joobleJobs = await fetchJoobleJobs('Ireland', 'analyst')
    checkedCompanies.push('Jooble (Ireland)')
  } catch (error) {
    failedCompanies.push({ name: 'Jooble', error: error instanceof Error ? error.message : String(error) })
  }

  const perUserSummaries: { userId: string; newMatchCount: number; emailedMatchCount: number; emailed: boolean }[] = []

  for (const { userId, email, profile } of profiles) {
    const candidateRows = scoreForUser(profile, atsRawJobs, arbeitnowJobs, adzunaJobs, joobleJobs, irelandVerifiedNames)

    let newMatches: SponsorAlertMatch[] = []

    if (candidateRows.length > 0) {
      const { data: insertedRows, error: insertError } = await supabase
        .from('seen_job_postings')
        .upsert(
          candidateRows.map((row) => ({ ...row, user_id: userId })),
          { onConflict: 'user_id,company_name,external_id', ignoreDuplicates: true },
        )
        .select('company_name, title, url, location, score_total, decision')

      if (insertError) {
        perUserSummaries.push({ userId, newMatchCount: 0, emailedMatchCount: 0, emailed: false })
        continue
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
      (match) => isEmailWorthyMatch(match.decision, match.title, profile.targetRoleLane),
    )

    let emailed = false
    if (emailWorthyMatches.length > 0) {
      try {
        await sendSponsorAlertEmail(emailWorthyMatches, email)
        emailed = true
      } catch (error) {
        console.warn('Stamp4 sponsor alert email failed', userId, error)
      }
    }

    perUserSummaries.push({
      userId,
      newMatchCount: newMatches.length,
      emailedMatchCount: emailWorthyMatches.length,
      emailed,
    })
  }

  const summary = {
    at: new Date().toISOString(),
    checkedCompanyCount: checkedCompanies.length,
    failedCompanyCount: failedCompanies.length,
    polledUserCount: profiles.length,
    newMatchCount: perUserSummaries.reduce((total, item) => total + item.newMatchCount, 0),
    emailedMatchCount: perUserSummaries.reduce((total, item) => total + item.emailedMatchCount, 0),
  }

  // Operational/global log entry, not per-user data - see docs/auth-migration.md's app_settings
  // ownership audit (last_sponsor_poll is explicitly a privileged-cron-written global key).
  await supabase
    .from('app_settings')
    .upsert({ key: 'last_sponsor_poll', value: summary, updated_at: summary.at }, { onConflict: 'key' })

  return NextResponse.json({ ...summary, checkedCompanies, failedCompanies, perUserSummaries })
}
