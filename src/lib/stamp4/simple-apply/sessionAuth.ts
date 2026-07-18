import { createHmac, timingSafeEqual } from 'node:crypto'

export const SESSION_COOKIE = 'stamp4_session'
const SESSION_SECONDS = 12 * 60 * 60

function secret() { return process.env.STAMP4_ACCESS_SECRET ?? '' }
function signature(expires: string) { return createHmac('sha256', secret()).update(expires).digest('base64url') }
function equal(left: string, right: string) { const a = Buffer.from(left); const b = Buffer.from(right); return a.length === b.length && timingSafeEqual(a, b) }
export function passwordIsValid(password: string) { const expected = secret(); return Boolean(expected && equal(password, expected)) }
export function createSessionToken() { const expires = String(Math.floor(Date.now() / 1000) + SESSION_SECONDS); return `${expires}.${signature(expires)}` }
export function sessionIsValid(token: string | undefined) { if (!token || !secret()) return false; const [expires, provided, extra] = token.split('.'); if (!expires || !provided || extra || !/^\d+$/.test(expires) || Number(expires) <= Math.floor(Date.now() / 1000)) return false; return equal(provided, signature(expires)) }
export const sessionCookieOptions = { httpOnly: true, sameSite: 'strict' as const, secure: process.env.NODE_ENV === 'production', path: '/', maxAge: SESSION_SECONDS }
