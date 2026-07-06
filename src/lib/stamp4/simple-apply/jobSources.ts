import { RAJ_PROFILE } from './profile'
import { apiCall } from './storage'

export interface JobSource {
  name: string
  url: string
  region: 'Ireland' | 'Netherlands' | 'EU-wide'
  bestFor: string
  fintechRelevant: boolean
  alertInstructions: string
  alertUrlHint: string | null
}

export interface SuggestedSource {
  name: string
  url: string | null
  region: 'Ireland' | 'Netherlands' | 'EU-wide'
  reasoning: string
  confidence: 'high' | 'medium' | 'low'
}

const FOURTEEN_DAYS_MS = 14 * 24 * 60 * 60 * 1000
const LAST_SOURCE_CHECK_KEY = 'last_source_check'
const GENERIC_ALERT_INSTRUCTIONS = 'Check platform for a saved-search or email-alert option near search results.'

export const JOB_SOURCES: JobSource[] = [
  {
    name: 'eFinancialCareers Ireland',
    url: 'https://www.efinancialcareers.ie',
    region: 'Ireland',
    bestFor: 'FinTech/banking-specific listings with higher signal-to-noise than generic boards for target roles.',
    fintechRelevant: true,
    alertInstructions: 'Search, then use Save this search or the job alert option and choose email delivery.',
    alertUrlHint: null,
  },
  {
    name: 'IrishJobs.ie',
    url: 'https://www.irishjobs.ie',
    region: 'Ireland',
    bestFor: 'Broad Irish market coverage, useful for Business Analyst and Systems Analyst searches.',
    fintechRelevant: true,
    alertInstructions: 'Run your search, click Create Job Alert near the results, then set frequency.',
    alertUrlHint: null,
  },
  {
    name: 'LinkedIn Jobs - Ireland',
    url: 'https://ie.linkedin.com/jobs',
    region: 'Ireland',
    bestFor: 'Widest reach, direct company postings and job alerts.',
    fintechRelevant: true,
    alertInstructions: 'Run your search, then toggle Create job alert above the results list. Set email frequency to Daily.',
    alertUrlHint: 'https://ie.linkedin.com/jobs/search',
  },
  {
    name: 'Jobs.ie',
    url: 'https://www.jobs.ie',
    region: 'Ireland',
    bestFor: 'General Irish job board, useful as a secondary source.',
    fintechRelevant: false,
    alertInstructions: GENERIC_ALERT_INSTRUCTIONS,
    alertUrlHint: null,
  },
  {
    name: 'Built In Dublin',
    url: 'https://builtindublin.ie',
    region: 'Ireland',
    bestFor: 'Tech-company listings, useful for FinTech scaleups such as Wayflyer and Stripe.',
    fintechRelevant: true,
    alertInstructions: 'Run your search and use the platform alert or saved-search option if available.',
    alertUrlHint: null,
  },
  {
    name: 'LinkedIn Jobs - Netherlands',
    url: 'https://nl.linkedin.com/jobs',
    region: 'Netherlands',
    bestFor: 'Widest reach and direct company postings in the Netherlands.',
    fintechRelevant: true,
    alertInstructions: 'Run your search, then toggle the job alert option and set frequency. Same pattern as LinkedIn Ireland.',
    alertUrlHint: 'https://nl.linkedin.com/jobs/search',
  },
  {
    name: 'IamExpat Careers',
    url: 'https://www.iamexpat.nl/career/jobs-netherlands',
    region: 'Netherlands',
    bestFor: 'English-speaking-friendly listings, useful for non-Dutch-speaker fit checks.',
    fintechRelevant: false,
    alertInstructions: 'Run the suggested search and look for saved-search or email-alert signup on the results page.',
    alertUrlHint: null,
  },
  {
    name: 'Undutchables',
    url: 'https://www.undutchables.nl',
    region: 'Netherlands',
    bestFor: 'Recruitment agency for English-speaking professionals in the Netherlands; worth registering directly.',
    fintechRelevant: false,
    alertInstructions: 'Register or search directly, then check for job alert or saved-search options for English-speaking roles.',
    alertUrlHint: null,
  },
  {
    name: 'Built In Amsterdam',
    url: 'https://builtin.com/jobs/eu/netherlands/amsterdam',
    region: 'Netherlands',
    bestFor: 'Tech-company listings with strong FinTech/payments presence, including Adyen and Mollie-style roles.',
    fintechRelevant: true,
    alertInstructions: 'Run your search and use the site alert or saved-search option if available.',
    alertUrlHint: null,
  },
  {
    name: 'Expatica Jobs',
    url: 'https://www.expatica.com/nl/working/finding-a-job',
    region: 'Netherlands',
    bestFor: 'General expat-focused job board, useful as a secondary source.',
    fintechRelevant: false,
    alertInstructions: GENERIC_ALERT_INSTRUCTIONS,
    alertUrlHint: null,
  },
  {
    name: 'eFinancialCareers (EU-wide)',
    url: 'https://www.efinancialcareers.com',
    region: 'EU-wide',
    bestFor: 'Pan-European finance and FinTech-specific board; filter by country from here.',
    fintechRelevant: true,
    alertInstructions: 'Search, then use Save this search or the job alert option and choose email delivery.',
    alertUrlHint: null,
  },
  {
    name: 'EU-Startups Jobs',
    url: 'https://www.eu-startups.com/jobs',
    region: 'EU-wide',
    bestFor: 'FinTech scaleup and startup roles across the EU, good for smaller high-growth companies.',
    fintechRelevant: true,
    alertInstructions: GENERIC_ALERT_INSTRUCTIONS,
    alertUrlHint: null,
  },
]

function withAlertDefaults(source: JobSource): JobSource {
  return {
    ...source,
    alertInstructions: source.alertInstructions || GENERIC_ALERT_INSTRUCTIONS,
    alertUrlHint: source.alertUrlHint ?? null,
  }
}

export async function getCustomSources(): Promise<JobSource[]> {
  const sources = await apiCall<JobSource[]>('sources', { method: 'GET' })
  return sources.map(withAlertDefaults)
}

export async function addCustomSource(source: JobSource): Promise<void> {
  await apiCall<{ ok: true }>('sources', { method: 'POST', body: JSON.stringify(withAlertDefaults(source)) })
}

export async function shouldPromptSourceCheck(): Promise<boolean> {
  const { value } = await apiCall<{ value: string | null }>(`settings?key=${encodeURIComponent(LAST_SOURCE_CHECK_KEY)}`)
  if (!value) return true

  const lastTime = new Date(value).getTime()
  if (Number.isNaN(lastTime)) return true

  return Date.now() - lastTime >= FOURTEEN_DAYS_MS
}

export async function recordSourceCheck(): Promise<void> {
  await apiCall<{ ok: true }>('settings', {
    method: 'POST',
    body: JSON.stringify({ key: LAST_SOURCE_CHECK_KEY, value: new Date().toISOString() }),
  })
}

export async function getDaysSinceSourceCheck(): Promise<number | null> {
  const { value } = await apiCall<{ value: string | null }>(`settings?key=${encodeURIComponent(LAST_SOURCE_CHECK_KEY)}`)
  if (!value) return null

  const lastTime = new Date(value).getTime()
  if (Number.isNaN(lastTime)) return null

  return Math.max(0, Math.floor((Date.now() - lastTime) / (24 * 60 * 60 * 1000)))
}

export async function getRelevantSources(country: string | null): Promise<JobSource[]> {
  const normalised = country?.toLowerCase() ?? ''
  const sources = [...JOB_SOURCES, ...(await getCustomSources())]

  if (normalised.includes('ireland')) {
    return sources.filter((source) => source.region === 'Ireland' || source.region === 'EU-wide')
  }

  if (normalised.includes('netherlands')) {
    return sources.filter((source) => source.region === 'Netherlands' || source.region === 'EU-wide')
  }

  return sources
}

export function buildSuggestedSearchQuery(region: 'Ireland' | 'Netherlands'): string {
  const roles = RAJ_PROFILE.targetRoleLane.slice(0, 3).join(' OR ')
  const location = region === 'Ireland' ? 'Dublin' : 'Amsterdam'
  return `(${roles}) ${location}`
}
