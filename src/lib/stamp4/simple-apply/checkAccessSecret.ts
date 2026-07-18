import { SESSION_COOKIE, sessionIsValid } from './sessionAuth'

export function checkAccessSecret(request: Request): boolean {
  const cookie = request.headers.get('cookie') ?? ''
  const token = cookie.split(';').map(part => part.trim().split('=')).find(([name]) => name === SESSION_COOKIE)?.[1]
  return sessionIsValid(token)
}
export function unauthorizedResponse() { return Response.json({ error: 'Unauthorised' }, { status: 401 }) }
