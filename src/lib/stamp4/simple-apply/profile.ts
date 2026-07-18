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

export function matchedDomainSectors(domainKeywords: readonly string[]): string[] {
  const matched = new Set(domainKeywords.map((keyword) => keyword.toLowerCase()))
  return DOMAIN_SECTORS.filter((sector) => sector.keywords.some((keyword) => matched.has(keyword))).map(
    (sector) => sector.name,
  )
}

export const RAJ_PROFILE = {
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
  proofAssets: {
    fisFintech: 'FIS FinTech software engineering experience (banking/payments systems)',
    payGuardIE:
      'PayGuard IE - payment reconciliation, SQL validation, UAT, defect evidence portfolio project',
    regPulse:
      'RegPulse - EU FinTech regulatory readiness dashboard (DORA/PSD3/FiDA)',
    stamp4Engine: 'Stamp4 Job Positioning Intelligence Engine - internal job-fit tooling',
    autoTimeAI: 'AutoTime AI - founder, AI automation product',
  },
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
