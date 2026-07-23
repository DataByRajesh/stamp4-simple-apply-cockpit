import { getSupabaseServer } from './supabaseServer'

// Apollo free-tier lookup for recruiter/talent-acquisition contacts at a company.
// Two-step by design: `mixed_people/api_search` is credit-free and finds candidate people;
// `people/match` reveals the email and consumes Apollo credits, so we only enrich a small,
// capped number of the most relevant matches, and cache results in Supabase to avoid
// re-spending credits on companies we've already looked up.
const RECRUITER_TITLES = [
  'Recruiter',
  'Technical Recruiter',
  'Talent Acquisition',
  'Talent Acquisition Partner',
  'Talent Acquisition Manager',
  'Head of Talent',
]

const CACHE_TTL_DAYS = 90

export interface RecruiterContact {
  name: string
  title: string | null
  email: string | null
  emailStatus: 'verified' | 'unverified' | 'not_found'
  linkedInUrl: string | null
}

export interface ContactLookupResult {
  companyName: string
  contacts: RecruiterContact[]
  source: 'apollo' | 'cache'
  fetchedAt: string
}

interface ApolloPersonSummary {
  id: string
  name: string
  title: string | null
  linkedin_url: string | null
}

interface ApolloMatchResponse {
  person?: {
    email?: string | null
    email_status?: string | null
  } | null
}

function apolloHeaders(apiKey: string) {
  return {
    'Content-Type': 'application/json',
    accept: 'application/json',
    'x-api-key': apiKey,
  }
}

async function searchApolloPeople(apiKey: string, companyName: string): Promise<ApolloPersonSummary[]> {
  const response = await fetch('https://api.apollo.io/api/v1/mixed_people/api_search', {
    method: 'POST',
    headers: apolloHeaders(apiKey),
    body: JSON.stringify({
      q_organization_name: companyName,
      person_titles: RECRUITER_TITLES,
      per_page: 10,
      page: 1,
    }),
  })

  if (!response.ok) {
    throw new Error(`Apollo people search failed with ${response.status}: ${await response.text()}`)
  }

  const data = await response.json()
  const people = Array.isArray(data.people) ? data.people : []
  return people.map((person: Record<string, unknown>) => ({
    id: String(person.id ?? ''),
    name: String(person.name ?? 'Unknown'),
    title: typeof person.title === 'string' ? person.title : null,
    linkedin_url: typeof person.linkedin_url === 'string' ? person.linkedin_url : null,
  }))
}

async function enrichApolloPerson(apiKey: string, personId: string): Promise<{ email: string | null; status: RecruiterContact['emailStatus'] }> {
  const response = await fetch('https://api.apollo.io/api/v1/people/match', {
    method: 'POST',
    headers: apolloHeaders(apiKey),
    body: JSON.stringify({ id: personId, reveal_personal_emails: false, reveal_phone_number: false }),
  })

  if (!response.ok) {
    throw new Error(`Apollo enrichment failed with ${response.status}: ${await response.text()}`)
  }

  const data: ApolloMatchResponse = await response.json()
  const email = data.person?.email ?? null
  const status = data.person?.email_status === 'verified' ? 'verified' : email ? 'unverified' : 'not_found'
  return { email, status }
}

async function readCache(companyKey: string): Promise<ContactLookupResult | null> {
  try {
    const supabase = getSupabaseServer()
    const { data, error } = await supabase
      .from('contact_lookup_cache')
      .select('company_name, contacts, fetched_at')
      .eq('company_key', companyKey)
      .maybeSingle()

    if (error || !data) return null

    const fetchedAt = new Date(data.fetched_at as string)
    const ageDays = (Date.now() - fetchedAt.getTime()) / (1000 * 60 * 60 * 24)
    if (ageDays > CACHE_TTL_DAYS) return null

    return {
      companyName: data.company_name as string,
      contacts: data.contacts as RecruiterContact[],
      source: 'cache',
      fetchedAt: data.fetched_at as string,
    }
  } catch {
    // Supabase not configured or table missing yet - fall through to a live Apollo lookup.
    return null
  }
}

async function writeCache(companyKey: string, result: ContactLookupResult): Promise<void> {
  try {
    const supabase = getSupabaseServer()
    await supabase.from('contact_lookup_cache').upsert({
      company_key: companyKey,
      company_name: result.companyName,
      contacts: result.contacts,
      fetched_at: result.fetchedAt,
    })
  } catch {
    // Caching is best-effort - a lookup should still succeed even if we can't persist it.
  }
}

export async function lookupRecruiterContacts(companyName: string, maxContacts = 3): Promise<ContactLookupResult> {
  const trimmed = companyName.trim()
  if (!trimmed) throw new Error('A company name is required for a contact lookup.')

  const companyKey = trimmed.toLowerCase()
  const cached = await readCache(companyKey)
  if (cached) return cached

  const apiKey = process.env.APOLLO_API_KEY
  if (!apiKey) throw new Error('Apollo is not configured. Set APOLLO_API_KEY.')

  const people = await searchApolloPeople(apiKey, trimmed)
  const shortlisted = people.slice(0, Math.max(1, maxContacts))

  const contacts: RecruiterContact[] = []
  for (const person of shortlisted) {
    const enriched = await enrichApolloPerson(apiKey, person.id)
    contacts.push({
      name: person.name,
      title: person.title,
      email: enriched.email,
      emailStatus: enriched.status,
      linkedInUrl: person.linkedin_url,
    })
  }

  const result: ContactLookupResult = {
    companyName: trimmed,
    contacts,
    source: 'apollo',
    fetchedAt: new Date().toISOString(),
  }

  await writeCache(companyKey, result)
  return result
}
