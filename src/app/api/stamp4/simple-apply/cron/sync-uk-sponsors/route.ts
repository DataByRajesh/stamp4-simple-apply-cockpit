import { NextResponse } from 'next/server'
import { fetchUkSkilledWorkerSponsorRecords } from '@/lib/stamp4/simple-apply/ukSponsorRegister'
import { getSupabaseServer } from '@/lib/stamp4/simple-apply/supabaseServer'

export const runtime = 'nodejs'

function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false

  return request.headers.get('authorization') === `Bearer ${secret}`
}

// Weekly refresh of the government-sourced UK sponsor register (see ukSponsorRegister.ts).
// Wholesale replace rather than incremental upsert, same rationale as sync-ireland-sponsors:
// the source file is itself a full snapshot each time, and a licence can be revoked between
// runs, which an upsert-only approach would never reflect. Weekly (not the UK register's own
// near-daily cadence) balances freshness against Vercel cron/Supabase write volume for a
// personal tool - Ireland/Netherlands remain the primary targets, so UK freshness is a
// secondary concern.
export async function GET(request: Request) {
  if (!isAuthorized(request)) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const supabase = getSupabaseServer()

  let records: Awaited<ReturnType<typeof fetchUkSkilledWorkerSponsorRecords>>
  try {
    records = await fetchUkSkilledWorkerSponsorRecords()
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 502 },
    )
  }

  const { error: deleteError } = await supabase.from('uk_verified_sponsors').delete().neq('company_name', '')
  if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 500 })

  const rows = records.map((record) => ({ company_name: record.name, rating: record.rating }))
  const { error: insertError } = await supabase.from('uk_verified_sponsors').insert(rows)
  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 })

  const summary = { at: new Date().toISOString(), companyCount: records.length }

  await supabase
    .from('app_settings')
    .upsert({ key: 'last_uk_sponsor_sync', value: summary, updated_at: summary.at }, { onConflict: 'key' })

  return NextResponse.json(summary)
}
