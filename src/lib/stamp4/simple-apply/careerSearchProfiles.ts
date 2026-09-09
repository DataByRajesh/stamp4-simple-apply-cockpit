import type { SupabaseClient } from '@supabase/supabase-js'
import type { CareerMobilityProfile } from './profile'

export type CareerSearchProfileRow = {
  userId: string
  email: string
  profile: CareerMobilityProfile
}

function isCareerMobilityProfile(value: unknown): value is CareerMobilityProfile {
  if (!value || typeof value !== 'object') return false
  const profile = value as Record<string, unknown>

  return (
    Array.isArray(profile.targetRoleLane) &&
    Array.isArray(profile.adjacentRoleLane) &&
    Array.isArray(profile.targetCountries) &&
    typeof profile.salaryPermitFloorEUR === 'number'
  )
}

/**
 * Every registered user's own career-search profile, joined with their
 * account email (used as the alert-digest recipient - no separate stored
 * email field to go stale). Requires the service-role client (cron-only,
 * per docs/auth-migration.md): reads across every user's row, which RLS
 * would otherwise block. A row that fails the CareerMobilityProfile shape
 * check is skipped rather than crashing the whole poll for every user.
 */
export async function listCareerSearchProfiles(
  supabase: SupabaseClient,
): Promise<CareerSearchProfileRow[]> {
  const { data, error } = await supabase.from('career_search_profiles').select('user_id, profile')
  if (error) throw new Error(error.message)

  const rows: CareerSearchProfileRow[] = []

  for (const row of (data ?? []) as { user_id: string; profile: unknown }[]) {
    if (!isCareerMobilityProfile(row.profile)) continue

    const { data: userData, error: userError } = await supabase.auth.admin.getUserById(row.user_id)
    if (userError || !userData.user?.email) continue

    rows.push({ userId: row.user_id, email: userData.user.email, profile: row.profile })
  }

  return rows
}
