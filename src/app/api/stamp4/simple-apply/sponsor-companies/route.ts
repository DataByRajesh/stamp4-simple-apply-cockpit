import { checkAccessSecret, unauthorizedResponse } from '@/lib/stamp4/simple-apply/checkAccessSecret'
import { parseJsonBody } from '@/lib/stamp4/simple-apply/parseJsonBody'
import type { AtsProvider, SponsorCompany } from '@/lib/stamp4/simple-apply/sponsorCompanies'
import { getSupabaseServer } from '@/lib/stamp4/simple-apply/supabaseServer'

type SponsorCompanyRow = {
  name: string
  country: SponsorCompany['country']
  sector: string | null
  why_sponsor_friendly: string | null
  careers_url: string | null
  ats_provider: AtsProvider | null
  ats_slug: string | null
}

function rowToCompany(row: SponsorCompanyRow): SponsorCompany {
  return {
    name: row.name,
    country: row.country,
    sector: row.sector ?? '',
    whySponsorFriendly: row.why_sponsor_friendly ?? '',
    careersUrl: row.careers_url ?? '',
    atsProvider: row.ats_provider,
    atsSlug: row.ats_slug,
  }
}

export async function GET(request: Request) {
  if (!checkAccessSecret(request)) return unauthorizedResponse()

  const { data, error } = await getSupabaseServer().from('custom_sponsor_companies').select('*').order('added_at')

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json((data as SponsorCompanyRow[]).map(rowToCompany))
}

export async function POST(request: Request) {
  if (!checkAccessSecret(request)) return unauthorizedResponse()

  const parsed = await parseJsonBody<SponsorCompany>(request)
  if (!parsed.ok) return parsed.response
  const company = parsed.body

  const { error } = await getSupabaseServer().from('custom_sponsor_companies').insert({
    name: company.name,
    country: company.country,
    sector: company.sector || null,
    why_sponsor_friendly: company.whySponsorFriendly || null,
    careers_url: company.careersUrl || null,
    ats_provider: company.atsProvider,
    ats_slug: company.atsSlug,
  })

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ ok: true })
}
