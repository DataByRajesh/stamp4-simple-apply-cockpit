// Only the two extension-facing capture routes need CORS at all - every other Stamp4 API route
// is called same-origin from the Next.js app itself. Access is still gated by the shared-secret
// Bearer header (see checkAccessSecret.ts); this only controls which origins the browser will
// let read the response, so it's scoped to chrome-extension:// origins rather than left open.
export function extensionCorsHeaders(request: Request): HeadersInit {
  const origin = request.headers.get('origin') ?? ''
  if (!origin.startsWith('chrome-extension://')) return {}

  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers': 'authorization, content-type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  }
}

export function extensionCorsPreflightResponse(request: Request): Response {
  return new Response(null, { status: 204, headers: extensionCorsHeaders(request) })
}
