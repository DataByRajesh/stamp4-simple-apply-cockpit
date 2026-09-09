import type { NextRequest } from 'next/server'
import type { CareerMobilityProfile } from '@/lib/stamp4/simple-apply/profile'
import { authenticateRequest } from '@/lib/stamp4/simple-apply/supabaseAuth'

export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request)
  if (auth instanceof Response) return auth

  const { data, error } = await auth.supabase
    .from('career_search_profiles')
    .select('profile')
    .eq('user_id', auth.user.id)
    .maybeSingle()

  if (error) return auth.json({ error: error.message }, { status: 500 })
  return auth.json((data?.profile as CareerMobilityProfile | undefined) ?? null)
}
