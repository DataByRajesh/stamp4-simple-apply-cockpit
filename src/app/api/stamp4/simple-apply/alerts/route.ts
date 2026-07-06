import { checkAccessSecret, unauthorizedResponse } from '@/lib/stamp4/simple-apply/checkAccessSecret'
import { getSupabaseServer } from '@/lib/stamp4/simple-apply/supabaseServer'

type AlertRow = { source_name: string; done: boolean }

export async function GET(request: Request) {
  if (!checkAccessSecret(request)) return unauthorizedResponse()

  const { data, error } = await getSupabaseServer().from('alert_setup_status').select('source_name, done')

  if (error) return Response.json({ error: error.message }, { status: 500 })

  const status = Object.fromEntries((data as AlertRow[]).map((row) => [row.source_name, row.done]))
  return Response.json(status)
}

export async function POST(request: Request) {
  if (!checkAccessSecret(request)) return unauthorizedResponse()

  const body = (await request.json()) as { sourceName?: string; source_name?: string; done?: boolean }
  const sourceName = body.sourceName ?? body.source_name

  if (!sourceName || typeof body.done !== 'boolean') {
    return Response.json({ error: 'Missing sourceName or done' }, { status: 400 })
  }

  const { error } = await getSupabaseServer().from('alert_setup_status').upsert(
    {
      source_name: sourceName,
      done: body.done,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'source_name' },
  )

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ ok: true })
}
