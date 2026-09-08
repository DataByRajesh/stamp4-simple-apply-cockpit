import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAuthClient } from '@/lib/stamp4/simple-apply/supabaseAuth'
import { createSessionToken, SESSION_COOKIE, sessionCookieOptions } from '@/lib/stamp4/simple-apply/sessionAuth'
export const runtime = 'nodejs'
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null) as { email?: unknown; password?: unknown } | null
  if (!body || typeof body.email !== 'string' || typeof body.password !== 'string') {
    return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
  }
  const cookiesToSet: Array<{ name: string; value: string; options?: Parameters<NextResponse['cookies']['set']>[2] }> = []
  const supabase = createSupabaseAuthClient(request, cookiesToSet)
  const { error } = await supabase.auth.signInWithPassword({ email: body.email, password: body.password })
  if (error) return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
  const response = NextResponse.json({ ok: true })
  for (const cookie of cookiesToSet) response.cookies.set(cookie.name, cookie.value, cookie.options)
  // Temporary bridge for routes that have not moved to the RLS-native client yet.
  response.cookies.set(SESSION_COOKIE, createSessionToken(), sessionCookieOptions)
  return response
}
