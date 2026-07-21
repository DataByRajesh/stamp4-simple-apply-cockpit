import { NextResponse } from 'next/server'
import { fetchIrelandVerifiedSponsorNames } from '@/lib/stamp4/simple-apply/irelandSponsorRegister'
import { getSupabaseServer } from '@/lib/stamp4/simple-apply/supabaseServer'

export const runtime = 'nodejs'

function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false

  return request.headers.get('authorization') === `Bearer ${secret}`
}

// Monthly refresh of the government-sourced Ireland sponsor register (see
// irelandSponsorRegister.ts). Wholesale replace rather than incremental upsert - the source
// file is itself a full snapshot each time, and companies can legitimately drop off it
// (e.g. a permit issued last year without a new one this year), which an upsert-only
// approach would never reflect.
export async function GET(request: Request) {
  if (!isAuthorized(request)) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const supabase = getSupabaseServer()
  const year = new Date().getFullYear()

  let names: string[]
  try {
    names = await fetchIrelandVerifiedSponsorNames(year)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 502 },
    )
  }

  const { error: deleteError } = await supabase.from('ireland_verified_sponsors').delete().neq('company_name', '')
  if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 500 })

  const rows = names.map((company_name) => ({ company_name }))
  const { error: insertError } = await supabase.from('ireland_verified_sponsors').insert(rows)
  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 })

  const summary = { at: new Date().toISOString(), year, companyCount: names.length }

  await supabase
    .from('app_settings')
    .upsert({ key: 'last_ireland_sponsor_sync', value: summary, updated_at: summary.at }, { onConflict: 'key' })

  return NextResponse.json(summary)
}
