import { checkAccessSecret, unauthorizedResponse } from '@/lib/stamp4/simple-apply/checkAccessSecret'
import { parseJsonBody } from '@/lib/stamp4/simple-apply/parseJsonBody'
import { getSupabaseServer } from '@/lib/stamp4/simple-apply/supabaseServer'
import type { ApplicationPack, TrackedJob, TrackerStatus } from '@/lib/stamp4/simple-apply/types'

export const runtime = 'nodejs'

const EMPTY_APPLICATION_PACK: ApplicationPack = {
  tailoredCvSummary: '',
  topCvBullets: [],
  coverMessage: '',
  recruiterLinkedInMessage: '',
  whyMeAnswer: '',
  projectProofParagraph: '',
}

type TrackedJobRow = {
  id: string
  company: string
  role_title: string
  country: string | null
  location: string | null
  salary: string | null
  score: number
  decision: TrackedJob['decision']
  status: TrackerStatus
  date_added: string
  notes: string | null
  generated_pack: TrackedJob['generatedPack'] | null
  proof_map: TrackedJob['proofMap'] | null
  correction_actions: TrackedJob['correctionActions'] | null
  score_breakdown: TrackedJob['scoreBreakdown'] | null
}

function rowToJob(row: TrackedJobRow): TrackedJob {
  return {
    id: row.id,
    company: row.company,
    roleTitle: row.role_title,
    country: row.country ?? '',
    location: row.location ?? '',
    salary: row.salary,
    score: row.score,
    decision: row.decision,
    status: row.status,
    dateAdded: row.date_added,
    notes: row.notes ?? '',
    generatedPack: row.generated_pack ?? EMPTY_APPLICATION_PACK,
    proofMap: row.proof_map ?? [],
    correctionActions: row.correction_actions ?? [],
    scoreBreakdown: row.score_breakdown ?? undefined,
  }
}

function jobToInsert(job: TrackedJob) {
  return {
    id: job.id,
    company: job.company,
    role_title: job.roleTitle,
    country: job.country || null,
    location: job.location || null,
    salary: job.salary,
    score: job.score,
    decision: job.decision,
    status: job.status,
    date_added: job.dateAdded,
    notes: job.notes,
    generated_pack: job.generatedPack,
    proof_map: job.proofMap,
    correction_actions: job.correctionActions,
    score_breakdown: job.scoreBreakdown ?? null,
    updated_at: new Date().toISOString(),
  }
}

export async function GET(request: Request) {
  if (!checkAccessSecret(request)) return unauthorizedResponse()

  const { data, error } = await getSupabaseServer()
    .from('tracked_jobs')
    .select('*')
    .order('date_added', { ascending: false })

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json((data as TrackedJobRow[]).map(rowToJob))
}

export async function POST(request: Request) {
  if (!checkAccessSecret(request)) return unauthorizedResponse()

  const parsed = await parseJsonBody<TrackedJob>(request)
  if (!parsed.ok) return parsed.response
  const job = parsed.body

  const { error } = await getSupabaseServer().from('tracked_jobs').upsert(jobToInsert(job), { onConflict: 'id' })

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ ok: true })
}

export async function PATCH(request: Request) {
  if (!checkAccessSecret(request)) return unauthorizedResponse()

  const parsed = await parseJsonBody<{ id?: string; status?: TrackerStatus; notes?: string }>(request)
  if (!parsed.ok) return parsed.response
  const body = parsed.body
  if (!body.id) return Response.json({ error: 'Missing id' }, { status: 400 })

  const update: { status?: TrackerStatus; notes?: string; updated_at: string } = { updated_at: new Date().toISOString() }
  if (body.status) update.status = body.status
  if (body.notes !== undefined) update.notes = body.notes

  const { error } = await getSupabaseServer().from('tracked_jobs').update(update).eq('id', body.id)

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ ok: true })
}

export async function DELETE(request: Request) {
  if (!checkAccessSecret(request)) return unauthorizedResponse()

  const id = new URL(request.url).searchParams.get('id')
  if (!id) return Response.json({ error: 'Missing id' }, { status: 400 })

  const { error } = await getSupabaseServer().from('tracked_jobs').delete().eq('id', id)

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ ok: true })
}
