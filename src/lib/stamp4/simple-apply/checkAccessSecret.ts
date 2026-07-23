import { SESSION_COOKIE, passwordIsValid, sessionIsValid } from './sessionAuth'

// Two auth paths: the web app authenticates via a signed, HttpOnly session cookie (set at
// login); the browser extension can't read or set that cookie cross-origin, so it authenticates
// with the same shared secret directly as a Bearer header instead (see STAMP4_ACCESS_SECRET in
// .env.example - "use the same value for server and client header"). Both paths use the
// existing timing-safe comparisons in sessionAuth.ts.
export function checkAccessSecret(request: Request): boolean {
  const authHeader = request.headers.get('authorization') ?? ''
  const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : ''
  if (bearerToken && passwordIsValid(bearerToken)) return true

  const cookie = request.headers.get('cookie') ?? ''
  const token = cookie.split(';').map(part => part.trim().split('=')).find(([name]) => name === SESSION_COOKIE)?.[1]
  return sessionIsValid(token)
}
export function unauthorizedResponse() { return Response.json({ error: 'Unauthorised' }, { status: 401 }) }
