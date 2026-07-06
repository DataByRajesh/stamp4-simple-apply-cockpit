export function checkAccessSecret(request: Request): boolean {
  const expected = process.env.STAMP4_ACCESS_SECRET
  const provided = request.headers.get('x-stamp4-secret')

  return Boolean(expected && provided && provided === expected)
}

export function unauthorizedResponse() {
  return Response.json({ error: 'Unauthorised' }, { status: 401 })
}
