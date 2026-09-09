import { authenticateRequest } from '@/lib/stamp4/simple-apply/supabaseAuth'
import type { NextRequest } from 'next/server'

// alert_setup_status and app_settings are deliberately fetched as empty
// arrays below, not from either table, even though BackupPayload's shape
// still expects both keys - both tables carry a pre-multi-tenant schema
// that can't be scoped to the caller yet:
//   - app_settings: a global key/value table (key text primary key, no
//     user_id at all) - auth-migration.md's own "app_settings ownership
//     audit" flags this explicitly and requires a composite-key redesign
//     before per-user access is possible.
//   - alert_setup_status: got a user_id column added, but its primary key
//     is still bare `source_name` (confirmed live against the target
//     Supabase project) - the same half-finished-migration shape as
//     seen_job_postings, not yet safe to scope by caller.
// Querying either table under the caller's identity right now would either
// leak other users' data (service-role, unfiltered) or silently return
// nothing once genuinely scoped (RLS with no matching user_id on existing
// rows) - empty arrays keep the response shape intact for callers while
// being honest that this data isn't included yet, not silently wrong.
export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request)
  if (auth instanceof Response) return auth

  const [trackedJobs, customJobSources] = await Promise.all([
    auth.supabase.from('tracked_jobs').select('*'),
    auth.supabase.from('custom_job_sources').select('*'),
  ])

  const error = trackedJobs.error?.message ?? customJobSources.error?.message

  if (error) return auth.json({ error }, { status: 500 })

  return auth.json({
    exportedAt: new Date().toISOString(),
    trackedJobs: trackedJobs.data,
    customJobSources: customJobSources.data,
    alertSetupStatus: [],
    appSettings: [],
  })
}
