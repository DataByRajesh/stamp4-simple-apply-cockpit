import type { NextRequest } from 'next/server'
import { parseJsonBody } from '@/lib/stamp4/simple-apply/parseJsonBody'
import { authenticateRequest } from '@/lib/stamp4/simple-apply/supabaseAuth'

// Per-user settings keys only - see docs/auth-migration.md's "app_settings
// ownership audit". Operational/global keys (last_sponsor_poll,
// last_ireland_sponsor_sync, last_uk_sponsor_sync) live in app_settings and
// are written directly by their cron routes via the service-role client;
// this route must never expose those to a regular signed-in caller.
const ALLOWED_KEYS = new Set(['candidate_evidence_profile', 'mobility_profile', 'last_source_check'])

export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request)
  if (auth instanceof Response) return auth

  const key = new URL(request.url).searchParams.get('key')
  if (!key || !ALLOWED_KEYS.has(key)) return auth.json({ error: 'Missing or unsupported key' }, { status: 400 })

  const { data, error } = await auth.supabase
    .from('user_app_settings')
    .select('value')
    .eq('user_id', auth.user.id)
    .eq('key', key)
    .maybeSingle()

  if (error) return auth.json({ error: error.message }, { status: 500 })
  return auth.json({ value: data?.value ?? null })
}

export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request)
  if (auth instanceof Response) return auth

  const parsed = await parseJsonBody<{ key?: string; value?: unknown }>(request)
  if (!parsed.ok) return parsed.response
  const body = parsed.body
  if (!body.key || !ALLOWED_KEYS.has(body.key)) return auth.json({ error: 'Missing or unsupported key' }, { status: 400 })
  if (JSON.stringify(body.value).length > 100_000) return auth.json({ error: 'Setting value is too large' }, { status: 413 })

  const { error } = await auth.supabase.from('user_app_settings').upsert(
    {
      user_id: auth.user.id,
      key: body.key,
      value: body.value,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,key' },
  )

  if (error) return auth.json({ error: error.message }, { status: 500 })
  return auth.json({ ok: true })
}
