import { RAJ_PROFILE } from './profile'
import type { ParsedJob } from './types'

const BROADER_SKILLS = [
  'excel',
  'servicenow',
  'itil',
  'agile',
  'scrum',
  'api',
  'apis',
  'rest',
  'data analysis',
  'power bi',
  'tableau',
  'python',
  'postman',
  'confluence',
  'etl',
  'saas',
]

const BROADER_LOCATIONS = [
  ...RAJ_PROFILE.positiveLocationSignals,
  'london',
  'manchester',
  'birmingham',
  'united kingdom',
  'uk',
  'england',
  'europe',
  'eu',
  'germany',
  'berlin',
  'munich',
  'frankfurt',
  'hamburg',
]

const TITLE_PATTERNS = [
  /(?:job title|role|position)\s*:\s*([^\n]+)/i,
  /(financial systems analyst|application analyst|business systems analyst|it business analyst|technical business analyst|uat analyst|business test analyst|application quality analyst|payments analyst|systems analyst)/i,
]

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)))
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function keywordMatches(text: string, keywords: readonly string[]) {
  return unique(keywords.filter((keyword) => new RegExp(`\\b${escapeRegExp(keyword)}s?\\b`, 'i').test(text)))
}

function phraseMatches(text: string, phrases: readonly string[]) {
  return unique(
    phrases.filter((phrase) => new RegExp(`\\b${escapeRegExp(phrase)}\\b`, 'i').test(text)),
  )
}

function getLines(rawText: string) {
  return rawText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
}

function cleanLabelValue(value: string) {
  return value
    .replace(
      /\s+(?:company|location|salary|responsibilities|requirements|preferred|nice to have|work pattern)\s*:.*$/i,
      '',
    )
    .replace(/[|,-]\s*$/g, '')
    .trim()
}

function extractTitle(rawText: string) {
  const lines = getLines(rawText)
  for (const pattern of TITLE_PATTERNS) {
    const match = rawText.match(pattern)
    if (match?.[1]) return cleanLabelValue(match[1])
  }
  return lines[0] ?? 'Unknown role'
}

function extractCompany(rawText: string) {
  const companyMatch = rawText.match(/company\s*:\s*([^\n]+)/i)
  if (companyMatch?.[1]) return cleanLabelValue(companyMatch[1])

  const aboutMatch = rawText.match(/about\s+([A-Z][A-Za-z0-9&'. -]{2,50})/)
  if (aboutMatch?.[1]) return aboutMatch[1].trim()

  const topLines = getLines(rawText).slice(0, 6)
  const proper = topLines.find((line) => /^[A-Z][A-Za-z0-9&'. -]{2,50}$/.test(line))
  return proper && proper !== extractTitle(rawText) ? proper : 'Unknown company'
}

function extractLocation(rawText: string) {
  const lower = rawText.toLowerCase()
  const matches = BROADER_LOCATIONS.filter((place) => new RegExp(`\\b${escapeRegExp(place)}\\b`).test(lower))
  const location = unique(matches).join(', ')
  let country = ''

  if (matches.some((place) => ['ireland', 'dublin', 'cork', 'galway', 'limerick'].includes(place))) {
    country = 'Ireland'
  } else if (
    matches.some((place) => ['netherlands', 'amsterdam', 'rotterdam', 'utrecht'].includes(place))
  ) {
    country = 'Netherlands'
  } else if (
    matches.some((place) => ['germany', 'berlin', 'munich', 'frankfurt', 'hamburg'].includes(place))
  ) {
    country = 'Germany'
  } else if (
    matches.some((place) => ['uk', 'united kingdom', 'england', 'london', 'manchester', 'birmingham'].includes(place))
  ) {
    country = 'UK'
  } else if (matches.includes('europe') || matches.includes('eu')) {
    country = 'EU'
  }

  return { country, location }
}

function extractSalary(rawText: string) {
  const moneyNumber = String.raw`(?:\d{4,6}|\d{2,3}(?:,\d{3})?)`
  const rangeDash = String.raw`[-\u2013]`
  const salaryMatch = rawText.match(
    new RegExp(String.raw`(?:\u20ac|\u00a3|\$)\s?${moneyNumber}(?:\s?(?:k|K))?(?:\s?${rangeDash}\s?(?:\u20ac|\u00a3|\$)?\s?${moneyNumber}(?:\s?(?:k|K))?)?(?:\s?(?:per annum|pa|annually|a year))?`, 'i'),
  )
  const prefixRange = rawText.match(
    new RegExp(String.raw`\b(?:eur|euro|gbp)\s?${moneyNumber}\s?${rangeDash}\s?${moneyNumber}(?:\s?(?:per annum|pa|annually|a year))?`, 'i'),
  )
  const textRange = rawText.match(
    new RegExp(String.raw`\b${moneyNumber}\s?${rangeDash}\s?${moneyNumber}\s?(?:eur|euro|gbp|k|per annum|pa)\b`, 'i'),
  )
  return salaryMatch?.[0] ?? prefixRange?.[0] ?? textRange?.[0] ?? null
}

function sectionText(rawText: string, headers: string[]) {
  const pattern = new RegExp(
    `(?:${headers.join('|')})\\s*:?([\\s\\S]*?)(?:\\n\\s*(?:requirements|preferred|nice to have|responsibilities|what you'll do|about you|benefits)\\s*:?|$)`,
    'i',
  )
  return rawText.match(pattern)?.[1] ?? ''
}

function extractBullets(text: string) {
  return getLines(text)
    .filter((line) => /^[-*\u2022]/.test(line) || line.length > 28)
    .map((line) => line.replace(/^[-*\u2022]\s*/, '').trim())
    .slice(0, 8)
}

export function parseJobDescription(rawText: string): ParsedJob {
  const lower = rawText.toLowerCase()
  const allSkills = unique([...RAJ_PROFILE.coreSkills, ...BROADER_SKILLS])
  const requiredSection = sectionText(rawText, ['requirements', 'about you', 'what you need'])
  const niceSection = sectionText(rawText, ['preferred', 'nice to have', 'desirable'])
  const requiredSkills = keywordMatches(requiredSection || rawText, allSkills)
  const niceToHaveSkills = keywordMatches(niceSection, allSkills)
  const { country, location } = extractLocation(rawText)
  const sponsorshipSignals = phraseMatches(lower, RAJ_PROFILE.permitRiskPhrases)
  const salary = extractSalary(rawText)
  const responsibilities = extractBullets(
    sectionText(rawText, ['responsibilities', "what you'll do", 'what you will do', 'duties']),
  )

  const redFlags = unique([
    ...sponsorshipSignals,
    ...(salary ? [] : ['salary not stated']),
    ...(/\b(?:3|6|9|12)\s*month contract\b/i.test(rawText) ? ['short fixed-term contract'] : []),
    ...(lower.includes('all industries') ? ['generic all-industries wording'] : []),
  ])

  const senioritySignals = unique([
    ...keywordMatches(rawText, ['junior', 'senior', 'lead', 'principal', 'manager']),
    ...(rawText.match(/\b\d+\+?\s+years?(?: of)? experience\b/gi) ?? []),
  ])

  const tools = keywordMatches(rawText, [
    'jira',
    'servicenow',
    'confluence',
    'excel',
    'power bi',
    'tableau',
    'postman',
    'sql',
  ])

  const workPattern = lower.includes('hybrid')
    ? 'hybrid'
    : lower.includes('on-site') || lower.includes('onsite')
      ? 'onsite'
      : lower.includes('remote')
        ? 'remote'
        : null

  return {
    roleTitle: extractTitle(rawText),
    company: extractCompany(rawText),
    country,
    location,
    salary,
    requiredSkills,
    niceToHaveSkills,
    tools,
    domainKeywords: keywordMatches(rawText, RAJ_PROFILE.targetDomains),
    responsibilities,
    sponsorshipSignals,
    redFlags,
    senioritySignals,
    workPattern,
    rawText,
  }
}


