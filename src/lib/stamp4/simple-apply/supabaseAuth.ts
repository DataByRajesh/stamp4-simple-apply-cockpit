import { createServerClient } from '@supabase/ssr'
import type { User } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

type CookieToSet = {
  name: string
  value: string
  options?: Parameters<NextResponse['cookies']['set']>[2]
}

function authConfiguration() {
  const url = process.env.SUPABASE_URL
  const anonKey = process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anonKey) {
    throw new Error('Supabase Auth is not configured. Set SUPABASE_URL and SUPABASE_ANON_KEY.')
  }
  return { url, anonKey }
}

export function createSupabaseAuthClient(request: NextRequest, cookiesToSet: CookieToSet[] = []) {
  const { url, anonKey } = authConfiguration()
  return createServerClient(url, anonKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookies) => { cookiesToSet.push(...cookies) },
    },
  })
}

function applyAuthCookies(response: NextResponse, cookiesToSet: CookieToSet[]) {
  for (const cookie of cookiesToSet) response.cookies.set(cookie.name, cookie.value, cookie.options)
  return response
}

export async function authenticateRequest(request: NextRequest) {
  const cookiesToSet: CookieToSet[] = []
  const supabase = createSupabaseAuthClient(request, cookiesToSet)
  const { data: { user }, error } = await supabase.auth.getUser()
  const json = (body: unknown, init?: ResponseInit) => applyAuthCookies(NextResponse.json(body, init), cookiesToSet)
  if (error || !user) return json({ error: 'Unauthorised' }, { status: 401 })
  return { user: user as User, supabase, json }
}
