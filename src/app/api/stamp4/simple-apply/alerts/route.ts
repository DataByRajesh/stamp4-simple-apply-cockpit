import type { NextRequest } from 'next/server'
import { parseJsonBody } from '@/lib/stamp4/simple-apply/parseJsonBody'
import { authenticateRequest } from '@/lib/stamp4/simple-apply/supabaseAuth'

type AlertRow = { source_name: string; done: boolean }

export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request)
  if (auth instanceof Response) return auth

  const { data, error } = await auth.supabase.from('alert_setup_status').select('source_name, done')

  if (error) return auth.json({ error: error.message }, { status: 500 })

  const status = Object.fromEntries((data as AlertRow[]).map((row) => [row.source_name, row.done]))
  return auth.json(status)
}

export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request)
  if (auth instanceof Response) return auth

  const parsed = await parseJsonBody<{ sourceName?: string; source_name?: string; done?: boolean }>(request)
  if (!parsed.ok) return parsed.response
  const body = parsed.body
  const sourceName = body.sourceName ?? body.source_name

  if (!sourceName || typeof body.done !== 'boolean') {
    return auth.json({ error: 'Missing sourceName or done' }, { status: 400 })
  }

  const { error } = await auth.supabase.from('alert_setup_status').upsert(
    {
      user_id: auth.user.id,
      source_name: sourceName,
      done: body.done,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,source_name' },
  )

  if (error) return auth.json({ error: error.message }, { status: 500 })
  return auth.json({ ok: true })
}
