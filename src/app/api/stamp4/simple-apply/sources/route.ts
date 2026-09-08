import { parseJsonBody } from '@/lib/stamp4/simple-apply/parseJsonBody'
import { authenticateRequest } from '@/lib/stamp4/simple-apply/supabaseAuth'
import type { JobSource } from '@/lib/stamp4/simple-apply/jobSources'
import type { NextRequest } from 'next/server'

type SourceRow = {
  name: string
  url: string | null
  region: JobSource['region']
  reasoning: string | null
}

function rowToSource(row: SourceRow): JobSource {
  return {
    name: row.name,
    url: row.url ?? '#',
    region: row.region,
    bestFor: row.reasoning ?? 'Raj-approved custom source.',
    fintechRelevant: true,
    alertInstructions: 'Check platform for a saved-search or email-alert option near search results.',
    alertUrlHint: row.url,
  }
}

export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request)
  if (auth instanceof Response) return auth

  const { data, error } = await auth.supabase.from('custom_job_sources').select('*').order('added_at')

  if (error) return auth.json({ error: error.message }, { status: 500 })
  return auth.json((data as SourceRow[]).map(rowToSource))
}

export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request)
  if (auth instanceof Response) return auth

  const parsed = await parseJsonBody<JobSource>(request)
  if (!parsed.ok) return parsed.response
  const source = parsed.body
  const { error } = await auth.supabase.from('custom_job_sources').insert({
    user_id: auth.user.id,
    name: source.name,
    url: source.url === '#' ? null : source.url,
    region: source.region,
    reasoning: source.bestFor,
    confidence: null,
  })

  if (error) return auth.json({ error: error.message }, { status: 500 })
  return auth.json({ ok: true })
}

