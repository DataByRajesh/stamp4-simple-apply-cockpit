import { NextRequest, NextResponse } from 'next/server'
import { SESSION_COOKIE, sessionIsValid } from '@/lib/stamp4/simple-apply/sessionAuth'
export function proxy(request: NextRequest) { if (sessionIsValid(request.cookies.get(SESSION_COOKIE)?.value)) return NextResponse.next(); return NextResponse.redirect(new URL('/stamp4/login', request.url)) }
export const config = { matcher: ['/stamp4/simple-apply/:path*'] }
