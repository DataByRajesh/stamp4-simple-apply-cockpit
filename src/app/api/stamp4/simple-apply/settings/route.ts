import { checkAccessSecret, unauthorizedResponse } from '@/lib/stamp4/simple-apply/checkAccessSecret'
import { getSupabaseServer } from '@/lib/stamp4/simple-apply/supabaseServer'

export async function GET(request: Request) {
  if (!checkAccessSecret(request)) return unauthorizedResponse()

  const key = new URL(request.url).searchParams.get('key')
  if (!key) return Response.json({ error: 'Missing key' }, { status: 400 })

  const { data, error } = await getSupabaseServer().from('app_settings').select('value').eq('key', key).maybeSingle()

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ value: data?.value ?? null })
}

export async function POST(request: Request) {
  if (!checkAccessSecret(request)) return unauthorizedResponse()

  const body = (await request.json()) as { key?: string; value?: unknown }
  if (!body.key) return Response.json({ error: 'Missing key' }, { status: 400 })

  const { error } = await getSupabaseServer().from('app_settings').upsert(
    {
      key: body.key,
      value: body.value,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'key' },
  )

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ ok: true })
}
