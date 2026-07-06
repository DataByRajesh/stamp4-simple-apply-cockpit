import { checkAccessSecret, unauthorizedResponse } from '@/lib/stamp4/simple-apply/checkAccessSecret'
import { getSupabaseServer } from '@/lib/stamp4/simple-apply/supabaseServer'

export async function GET(request: Request) {
  if (!checkAccessSecret(request)) return unauthorizedResponse()

  const supabase = getSupabaseServer()

  const [trackedJobs, customJobSources, alertSetupStatus, appSettings] = await Promise.all([
    supabase.from('tracked_jobs').select('*'),
    supabase.from('custom_job_sources').select('*'),
    supabase.from('alert_setup_status').select('*'),
    supabase.from('app_settings').select('*'),
  ])

  const error =
    trackedJobs.error?.message ??
    customJobSources.error?.message ??
    alertSetupStatus.error?.message ??
    appSettings.error?.message

  if (error) return Response.json({ error }, { status: 500 })

  return Response.json({
    exportedAt: new Date().toISOString(),
    trackedJobs: trackedJobs.data,
    customJobSources: customJobSources.data,
    alertSetupStatus: alertSetupStatus.data,
    appSettings: appSettings.data,
  })
}
