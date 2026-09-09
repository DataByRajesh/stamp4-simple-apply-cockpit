import { authenticateRequest } from '@/lib/stamp4/simple-apply/supabaseAuth'
import type { NextRequest } from 'next/server'

// app_settings is deliberately fetched as an empty array below, not from
// the table, even though BackupPayload's shape still expects the key: it's
// a global key/value table (key text primary key, no user_id at all) -
// auth-migration.md's own "app_settings ownership audit" flags this
// explicitly and requires a composite-key redesign before per-user access
// is possible. alert_setup_status was in the same half-finished shape but
// is now migrated (user_id + composite primary key, RLS-scoped) - see
// career_search_profiles/seen_job_postings/alert_setup_status in
// auth-migration.md's migration status.
export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request)
  if (auth instanceof Response) return auth

  const [trackedJobs, customJobSources, alertSetupStatus] = await Promise.all([
    auth.supabase.from('tracked_jobs').select('*'),
    auth.supabase.from('custom_job_sources').select('*'),
    auth.supabase.from('alert_setup_status').select('source_name, done, updated_at'),
  ])

  const error = trackedJobs.error?.message ?? customJobSources.error?.message ?? alertSetupStatus.error?.message

  if (error) return auth.json({ error }, { status: 500 })

  return auth.json({
    exportedAt: new Date().toISOString(),
    trackedJobs: trackedJobs.data,
    customJobSources: customJobSources.data,
    alertSetupStatus: alertSetupStatus.data,
    appSettings: [],
  })
}
