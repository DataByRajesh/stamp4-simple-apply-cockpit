import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let supabaseServer: SupabaseClient | null = null

export function getSupabaseServer() {
  const url = process.env.SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceRoleKey) {
    throw new Error('Supabase is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.')
  }

  if (!supabaseServer) {
    supabaseServer = createClient(url, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })
  }

  return supabaseServer
}
