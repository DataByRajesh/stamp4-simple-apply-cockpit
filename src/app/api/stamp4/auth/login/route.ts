import { NextResponse } from 'next/server'
import { createSessionToken, passwordIsValid, SESSION_COOKIE, sessionCookieOptions } from '@/lib/stamp4/simple-apply/sessionAuth'
export const runtime = 'nodejs'
export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { password?: unknown } | null
  if (!body || typeof body.password !== 'string' || !passwordIsValid(body.password)) return NextResponse.json({ error: 'Invalid password' }, { status: 401 })
  const response = NextResponse.json({ ok: true }); response.cookies.set(SESSION_COOKIE, createSessionToken(), sessionCookieOptions); return response
}
