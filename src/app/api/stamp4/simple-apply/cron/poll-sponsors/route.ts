import { NextResponse } from 'next/server'
import { fetchAtsJobs } from '@/lib/stamp4/simple-apply/atsFeeds'
import { sendSponsorAlertEmail, type SponsorAlertMatch } from '@/lib/stamp4/simple-apply/email'
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
}

function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false

  return request.headers.get('authorization') === `Bearer ${secret}`
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

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
