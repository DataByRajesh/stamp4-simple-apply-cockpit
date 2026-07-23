import { randomUUID } from 'node:crypto'
import { checkAccessSecret } from '@/lib/stamp4/simple-apply/checkAccessSecret'
import { extensionCorsHeaders, extensionCorsPreflightResponse } from '@/lib/stamp4/simple-apply/extensionCors'
import { parseJsonBody } from '@/lib/stamp4/simple-apply/parseJsonBody'
import { getSupabaseServer } from '@/lib/stamp4/simple-apply/supabaseServer'

export const runtime = 'nodejs'

const MAX_RAW_TEXT_LENGTH = 100_000

export async function OPTIONS(request: Request) {
  return extensionCorsPreflightResponse(request)
}

// POST: called by the extension after the user clicks "Send to Stamp4" on a job posting.
export async function POST(request: Request) {
  const cors = extensionCorsHeaders(request)
  if (!checkAccessSecret(request)) return Response.json({ error: 'Unauthorised' }, { status: 401, headers: cors })

  const parsed = await parseJsonBody<{ rawText?: string; sourceUrl?: string }>(request)
  if (!parsed.ok) return parsed.response

  const rawText = parsed.body.rawText?.trim()
  if (!rawText) return Response.json({ error: 'Missing rawText' }, { status: 400, headers: cors })
  if (rawText.length > MAX_RAW_TEXT_LENGTH) return Response.json({ error: 'rawText is too long' }, { status: 413, headers: cors })

  const token = randomUUID()
  const { error } = await getSupabaseServer().from('capture_handoffs').insert({
    token,
    raw_text: rawText,
    source_url: parsed.body.sourceUrl?.slice(0, 2000) ?? null,
  })

  if (error) return Response.json({ error: error.message }, { status: 500, headers: cors })
  return Response.json({ token }, { headers: cors })
}

// GET: called by the Cockpit page on load when a ?captureToken= param is present. One-shot -
// deletes the row so revisiting the same URL (e.g. a refresh) doesn't re-populate the form.
export async function GET(request: Request) {
  const cors = extensionCorsHeaders(request)
  if (!checkAccessSecret(request)) return Response.json({ error: 'Unauthorised' }, { status: 401, headers: cors })

  const token = new URL(request.url).searchParams.get('token')
  if (!token) return Response.json({ error: 'Missing token query parameter' }, { status: 400, headers: cors })

  const supabase = getSupabaseServer()
  const { data, error } = await supabase
    .from('capture_handoffs')
    .select('raw_text, source_url')
    .eq('token', token)
    .maybeSingle()

  if (error) return Response.json({ error: error.message }, { status: 500, headers: cors })
  if (!data) return Response.json({ error: 'Capture token not found or already used' }, { status: 404, headers: cors })

  await supabase.from('capture_handoffs').delete().eq('token', token)

  return Response.json({ rawText: data.raw_text, sourceUrl: data.source_url }, { headers: cors })
}
