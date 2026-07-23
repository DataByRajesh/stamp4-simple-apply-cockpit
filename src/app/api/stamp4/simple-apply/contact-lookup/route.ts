import { checkAccessSecret, unauthorizedResponse } from '@/lib/stamp4/simple-apply/checkAccessSecret'
import { lookupRecruiterContacts } from '@/lib/stamp4/simple-apply/contactLookup'

export async function GET(request: Request) {
  if (!checkAccessSecret(request)) return unauthorizedResponse()

  const params = new URL(request.url).searchParams
  const company = params.get('company')?.trim()
  if (!company) return Response.json({ error: 'A company query parameter is required.' }, { status: 400 })

  try {
    const result = await lookupRecruiterContacts(company)
    return Response.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Contact lookup failed.'
    return Response.json({ error: message }, { status: 502 })
  }
}
