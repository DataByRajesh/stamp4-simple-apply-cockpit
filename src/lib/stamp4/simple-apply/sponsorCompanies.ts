import { apiCall } from './storage'

export type AtsProvider = 'greenhouse' | 'lever' | 'ashby'

export interface SponsorCompany {
  name: string
  country: 'Ireland' | 'Netherlands'
  sector: string
  whySponsorFriendly: string
  careersUrl: string
  /** Set only when the exact public ATS board token has been verified live - guessing a wrong slug just 404s. */
  atsProvider: AtsProvider | null
  atsSlug: string | null
}

/**
 * Starting point, not a verified-today register snapshot. Cross-check against the live official
 * registers before relying on a specific company: Ireland's employment permit statistics/company
 * listings (enterprise.gov.ie) and the Netherlands IND public register of recognised sponsors
 * (ind.nl/en/public-register-recognised-sponsors). Government registers change monthly.
 */
export const SPONSOR_COMPANIES: SponsorCompany[] = [
  {
    name: 'Stripe',
    country: 'Ireland',
    sector: 'Payments infrastructure',
    whySponsorFriendly: 'Large Dublin EMEA hub with a long history of Critical Skills permit sponsorship.',
    careersUrl: 'https://stripe.com/jobs/search?office_locations=Europe--Ireland--Dublin',
    atsProvider: 'greenhouse',
    atsSlug: 'stripe',
  },
  {
    name: 'Wayflyer',
    country: 'Ireland',
    sector: 'Revenue-based financing FinTech',
    whySponsorFriendly: 'Dublin-headquartered FinTech scaleup that regularly hires internationally.',
    careersUrl: 'https://wayflyer.com/en/careers',
    atsProvider: 'ashby',
    atsSlug: 'wayflyer',
  },
  {
    name: 'Fenergo',
    country: 'Ireland',
    sector: 'RegTech / client lifecycle management',
    whySponsorFriendly: 'Dublin-headquartered RegTech vendor serving global banks; frequent international hiring.',
    careersUrl: 'https://www.fenergo.com/careers',
    atsProvider: null,
    atsSlug: null,
  },
  {
    name: 'TransferMate',
    country: 'Ireland',
    sector: 'Cross-border payments FinTech',
    whySponsorFriendly: 'Irish-founded international payments FinTech with EU-wide hiring.',
    careersUrl: 'https://www.transfermate.com/careers',
    atsProvider: null,
    atsSlug: null,
  },
  {
    name: 'CurrencyFair',
    country: 'Ireland',
    sector: 'FX / cross-border payments FinTech',
    whySponsorFriendly: 'Dublin-based FX FinTech, smaller but relevant for systems/application analyst roles.',
    careersUrl: 'https://www.currencyfair.com/careers/',
    atsProvider: null,
    atsSlug: null,
  },
  {
    name: 'AIB (Allied Irish Banks)',
    country: 'Ireland',
    sector: 'Retail & corporate banking',
    whySponsorFriendly: 'Major Irish bank with an established international hiring and permit process.',
    careersUrl: 'https://careers.aib.ie',
    atsProvider: null,
    atsSlug: null,
  },
  {
    name: 'Bank of Ireland',
    country: 'Ireland',
    sector: 'Retail & corporate banking',
    whySponsorFriendly: 'Major Irish bank with ongoing technology/analyst hiring.',
    careersUrl: 'https://careersbankofireland.com',
    atsProvider: null,
    atsSlug: null,
  },
  {
    name: 'Workday',
    country: 'Ireland',
    sector: 'Enterprise finance/HR systems software',
    whySponsorFriendly: 'EMEA headquarters in Dublin; large multinational with a mature international-hire process.',
    careersUrl: 'https://workday.wd5.myworkdayjobs.com/Workday',
    atsProvider: null,
    atsSlug: null,
  },
  {
    name: 'Deloitte Ireland',
    country: 'Ireland',
    sector: 'Financial services technology consulting',
    whySponsorFriendly: 'Big 4 firm with a large financial-services technology practice and frequent permit sponsorship.',
    careersUrl: 'https://www2.deloitte.com/ie/en/careers.html',
    atsProvider: null,
    atsSlug: null,
  },
  {
    name: 'Accenture Ireland',
    country: 'Ireland',
    sector: 'Technology & financial services consulting',
    whySponsorFriendly: 'Large multinational consultancy with an established Irish international-hire pipeline.',
    careersUrl: 'https://www.accenture.com/ie-en/careers',
    atsProvider: null,
    atsSlug: null,
  },
  {
    name: 'Adyen',
    country: 'Netherlands',
    sector: 'Global payments platform',
    whySponsorFriendly: 'Amsterdam-headquartered global payments company with a large Highly Skilled Migrant intake.',
    careersUrl: 'https://careers.adyen.com',
    atsProvider: 'greenhouse',
    atsSlug: 'adyen',
  },
  {
    name: 'Mollie',
    country: 'Netherlands',
    sector: 'Payments FinTech',
    whySponsorFriendly: 'Amsterdam-based payments FinTech serving 250,000+ merchants; regularly hires internationally.',
    careersUrl: 'https://jobs.mollie.com',
    atsProvider: null,
    atsSlug: null,
  },
  {
    name: 'Bunq',
    country: 'Netherlands',
    sector: 'Challenger bank',
    whySponsorFriendly: 'Dutch neobank with a young, internationally hired workforce.',
    careersUrl: 'https://www.bunq.com/careers',
    atsProvider: null,
    atsSlug: null,
  },
  {
    name: 'ING',
    country: 'Netherlands',
    sector: 'Retail & corporate banking',
    whySponsorFriendly: 'Major Dutch bank with an established Highly Skilled Migrant sponsorship process.',
    careersUrl: 'https://www.ing.jobs',
    atsProvider: null,
    atsSlug: null,
  },
  {
    name: 'Backbase',
    country: 'Netherlands',
    sector: 'Digital banking platform software',
    whySponsorFriendly: 'Amsterdam-headquartered banking-software vendor selling to global banks; internationally hires engineering/analyst roles.',
    careersUrl: 'https://www.backbase.com/careers',
    atsProvider: null,
    atsSlug: null,
  },
  {
    name: 'Booking.com',
    country: 'Netherlands',
    sector: 'Travel platform (large finance/data systems function)',
    whySponsorFriendly: 'Very large Amsterdam employer with one of the highest Highly Skilled Migrant sponsorship volumes in NL.',
    careersUrl: 'https://careers.booking.com',
    atsProvider: null,
    atsSlug: null,
  },
]

export function sponsorRegisterLinks() {
  return {
    ireland: 'https://enterprise.gov.ie/en/what-we-do/workplace-and-skills/employment-permits/statistics/',
    netherlands: 'https://ind.nl/en/public-register-recognised-sponsors/public-register-work',
  }
}

export async function getCustomSponsorCompanies(): Promise<SponsorCompany[]> {
  return apiCall<SponsorCompany[]>('sponsor-companies', { method: 'GET' })
}

export async function addCustomSponsorCompany(company: SponsorCompany): Promise<void> {
  await apiCall<{ ok: true }>('sponsor-companies', { method: 'POST', body: JSON.stringify(company) })
}

export async function getAllSponsorCompanies(): Promise<SponsorCompany[]> {
  return [...SPONSOR_COMPANIES, ...(await getCustomSponsorCompanies())]
}
