import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAuthClient } from '@/lib/stamp4/simple-apply/supabaseAuth'
import { SESSION_COOKIE } from '@/lib/stamp4/simple-apply/sessionAuth'
export async function POST(request: NextRequest) {
  const cookiesToSet: Array<{ name: string; value: string; options?: Parameters<NextResponse['cookies']['set']>[2] }> = []
  const supabase = createSupabaseAuthClient(request, cookiesToSet)
  await supabase.auth.signOut()
  const response = NextResponse.json({ ok: true })
  for (const cookie of cookiesToSet) response.cookies.set(cookie.name, cookie.value, cookie.options)
  response.cookies.set(SESSION_COOKIE, '', {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  })
  return response
}
