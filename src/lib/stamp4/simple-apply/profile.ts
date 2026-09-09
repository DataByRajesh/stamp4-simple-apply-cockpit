// Named sector categories, mirroring how the sponsor-companies watchlist groups by sector -
// gives domain-fit scoring a legible "which sector(s) does this JD belong to" answer instead of
// just a bag of matched keywords, and organises the vocabulary so it's easier to extend per sector.
const DOMAIN_SECTORS = [
  {
    name: 'Payments & Transactions',
    keywords: ['fintech', 'payments', 'reconciliation', 'settlement', 'transaction', 'clearing', 'chargeback', 'ledger'],
  },
  {
    name: 'Banking & Financial Services',
    keywords: [
      'banking',
      'financial services',
      'saas finance',
      'core banking',
      'digital banking',
      'open banking',
      'lending',
      'credit risk',
      'trade finance',
    ],
  },
  {
    name: 'Risk, Compliance & RegTech',
    keywords: ['kyc', 'aml', 'compliance', 'risk', 'regulatory', 'regtech', 'dora', 'psd2', 'psd3', 'fida', 'fraud'],
  },
  {
    name: 'Enterprise Systems',
    keywords: ['enterprise systems'],
  },
] as const

// The JD-requirement categories proofMapper.ts matches against. A tagged
// proof asset can support more than one - e.g. a reconciliation project
// usually demonstrates payments, SQL/data validation and UAT all at once.
export type ProofTag =
  | 'payments'
  | 'sql-data-validation'
  | 'uat-testing'
  | 'incident-support'
  | 'compliance-regulatory'
  | 'stakeholder-communication'

/**
 * One piece of evidence (a project, a role, a specific achievement) the
 * candidate can point to, tagged by which JD-requirement categories it
 * supports. Replaces the old Record<string, string> shape (fixed keys like
 * "fisFintech"/"payGuardIE") which only ever worked for the one profile it
 * was written for - proofMapper.ts now matches on tags, not on knowing a
 * specific project's name in advance, so this generalizes to any
 * candidate's own portfolio.
 */
export interface ProofAsset {
  id: string
  label: string
  description: string
  tags: readonly ProofTag[]
}

export interface CareerMobilityProfile {
  yearsExperience: number
  targetCountries: readonly string[]
  passiveCountries: readonly string[]
  targetRoleLane: readonly string[]
  adjacentRoleLane: readonly string[]
  domainSectors: readonly { name: string; keywords: readonly string[] }[]
  targetDomains: readonly string[]
  coreSkills: readonly string[]
  proofAssets: readonly ProofAsset[]
  positiveLocationSignals: readonly string[]
  permitRiskPhrases: readonly string[]
  salaryPermitFloorEUR: number
  salaryTargetRangeEUR: { min: number; max: number }
}

export function matchedDomainSectors(domainKeywords: readonly string[], sectors: CareerMobilityProfile['domainSectors'] = DOMAIN_SECTORS): string[] {
  const matched = new Set(domainKeywords.map((keyword) => keyword.toLowerCase()))
  return sectors.filter((sector) => sector.keywords.some((keyword) => matched.has(keyword))).map(
    (sector) => sector.name,
  )
}

export const RAJ_PROFILE: CareerMobilityProfile = {
  yearsExperience: 3,
  targetCountries: ['Ireland', 'Netherlands'],
  passiveCountries: ['UK'],
  targetRoleLane: [
    'systems analyst',
    'application analyst',
    'business systems analyst',
    'it business analyst',
    'technical business analyst',
    'uat analyst',
    'business test analyst',
    'application quality analyst',
    'payments analyst',
  ],
  // Genuinely adjacent analyst titles - real fits, just not the primary lane above (roleFit 3.75 vs 5).
  adjacentRoleLane: [
    'data analyst',
    'risk analyst',
    'compliance analyst',
    'product analyst',
    'reporting analyst',
    'quality assurance analyst',
    'qa analyst',
    'operations analyst',
    'business intelligence analyst',
    'financial analyst',
  ],
  domainSectors: DOMAIN_SECTORS,
  targetDomains: DOMAIN_SECTORS.flatMap((sector) => sector.keywords),
  coreSkills: [
    'sql',
    'data validation',
    'uat',
    'jira',
    'testing',
    'defect',
    'incident',
    'production support',
    'application support',
    'logs',
    'monitoring',
    'reporting',
    'workflow',
    'stakeholder',
    'requirements',
    'user stories',
  ],
  proofAssets: [
    {
      id: 'fisFintech',
      label: 'FIS FinTech experience',
      description: 'FIS FinTech software engineering experience (banking/payments systems)',
      tags: ['payments', 'sql-data-validation', 'uat-testing'],
    },
    {
      id: 'payGuardIE',
      label: 'PayGuard IE',
      description: 'PayGuard IE - payment reconciliation, SQL validation, UAT, defect evidence portfolio project',
      tags: ['payments', 'sql-data-validation', 'uat-testing'],
    },
    {
      id: 'fisYalamanchiliSupport',
      label: 'FIS/Yalamanchili application support',
      description: 'FIS/Yalamanchili banking and payment application maintenance/support experience',
      tags: ['incident-support'],
    },
    {
      id: 'regPulse',
      label: 'RegPulse',
      description: 'RegPulse - EU FinTech regulatory readiness dashboard (DORA/PSD3/FiDA)',
      tags: ['compliance-regulatory'],
    },
    {
      id: 'analystStakeholderWork',
      label: 'Business-user support and application analyst positioning',
      description: 'Business-user support + application analyst positioning',
      tags: ['stakeholder-communication'],
    },
    {
      id: 'stamp4Engine',
      label: 'Stamp4 Job Positioning Intelligence Engine',
      description: 'Stamp4 Job Positioning Intelligence Engine - internal job-fit tooling',
      tags: [],
    },
    {
      id: 'autoTimeAI',
      label: 'AutoTime AI',
      description: 'AutoTime AI - founder, AI automation product',
      tags: [],
    },
  ],
  positiveLocationSignals: [
    'ireland',
    'dublin',
    'cork',
    'galway',
    'limerick',
    'netherlands',
    'amsterdam',
    'rotterdam',
    'utrecht',
  ],
  permitRiskPhrases: [
    'no sponsorship',
    'must have right to work',
    'unrestricted right to work',
    'sponsorship not available',
    'must be based in ireland',
    'must already be eligible to work',
    '6 month contract',
    'contract',
    'temporary',
  ],
  salaryPermitFloorEUR: 40904,
  salaryTargetRangeEUR: { min: 45000, max: 55000 },
} as const
