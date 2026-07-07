export async function parseJsonBody<T>(
  request: Request,
): Promise<{ ok: true; body: T } | { ok: false; response: Response }> {
  try {
    return { ok: true, body: (await request.json()) as T }
  } catch {
    return { ok: false, response: Response.json({ error: 'Invalid JSON body' }, { status: 400 }) }
  }
}
