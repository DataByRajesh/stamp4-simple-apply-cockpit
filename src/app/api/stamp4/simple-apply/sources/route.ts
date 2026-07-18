import { checkAccessSecret, unauthorizedResponse } from '@/lib/stamp4/simple-apply/checkAccessSecret'
import { parseJsonBody } from '@/lib/stamp4/simple-apply/parseJsonBody'
import { getSupabaseServer } from '@/lib/stamp4/simple-apply/supabaseServer'
import type { JobSource } from '@/lib/stamp4/simple-apply/jobSources'

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

export async function GET(request: Request) {
  if (!checkAccessSecret(request)) return unauthorizedResponse()

  const { data, error } = await getSupabaseServer().from('custom_job_sources').select('*').order('added_at')

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json((data as SourceRow[]).map(rowToSource))
}

export async function POST(request: Request) {
  if (!checkAccessSecret(request)) return unauthorizedResponse()

  const parsed = await parseJsonBody<JobSource>(request)
  if (!parsed.ok) return parsed.response
  const source = parsed.body
  const { error } = await getSupabaseServer().from('custom_job_sources').insert({
    name: source.name,
    url: source.url === '#' ? null : source.url,
    region: source.region,
    reasoning: source.bestFor,
    confidence: null,
  })

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ ok: true })
}

