import { NextResponse } from 'next/server'
import { checkAccessSecret, unauthorizedResponse } from '@/lib/stamp4/simple-apply/checkAccessSecret'
import type { JobSource, SuggestedSource } from '@/lib/stamp4/simple-apply/jobSources'
import { callStructuredLLM } from '@/lib/stamp4/simple-apply/llm'

export const runtime = 'nodejs'

const SOURCE_DISCOVERY_SYSTEM_PROMPT = `You are helping identify job boards and recruitment platforms relevant to a specific job search. Only suggest sources you have reasonable confidence actually exist and are still active. Mark your confidence honestly. If you are not sure a site currently exists or is still maintained, say so in the confidence field rather than guessing.`.trim()

const SUGGESTION_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['suggestions'],
  properties: {
    suggestions: {
      type: 'array',
      maxItems: 5,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['name', 'url', 'region', 'reasoning', 'confidence'],
        properties: {
          name: { type: 'string' },
          url: { type: ['string', 'null'] },
          region: { type: 'string', enum: ['Ireland', 'Netherlands', 'EU-wide'] },
          reasoning: { type: 'string' },
          confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
        },
      },
    },
  },
} as const

function isJobSourceArray(value: unknown): value is JobSource[] {
  if (!Array.isArray(value)) return false
  return value.every((source) => {
    if (!source || typeof source !== 'object') return false
    const item = source as JobSource
    return typeof item.name === 'string' && typeof item.url === 'string'
  })
}

function isSuggestedSource(value: unknown): value is SuggestedSource {
  if (!value || typeof value !== 'object') return false
  const item = value as SuggestedSource
  return (
    typeof item.name === 'string' &&
    (typeof item.url === 'string' || item.url === null) &&
    ['Ireland', 'Netherlands', 'EU-wide'].includes(item.region) &&
    typeof item.reasoning === 'string' &&
    ['high', 'medium', 'low'].includes(item.confidence)
  )
}

function buildUserPrompt(existingSources: JobSource[]) {
  const existingNames = existingSources.map((source) => source.name).join(', ')

  return `Target: Ireland and Netherlands FinTech / Financial Systems Analyst / Application Analyst / Business Systems Analyst roles.

Already known sources. Do NOT repeat these: ${existingNames}

Suggest up to 5 additional job boards, recruitment agencies, or company career pages that specifically fit this search. Prioritise:
- FinTech/RegTech-specific platforms
- Ireland or Netherlands-focused boards, not purely generic global ones
- Sources aimed at systems/business analyst or application analyst roles

Return ONLY JSON matching this shape:
{ "suggestions": [{ "name": "...", "url": "...", "region": "Ireland|Netherlands|EU-wide", "reasoning": "one sentence", "confidence": "high|medium|low" }] }

If you are not confident in a specific URL, set "url" to null rather than guessing one. Do not include job postings; suggest source directories only.`.trim()
}

export async function POST(request: Request) {
  if (!checkAccessSecret(request)) return unauthorizedResponse()

  let body: unknown

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON request' }, { status: 400 })
  }

  const existingSources = (body as { existingSources?: unknown })?.existingSources
  if (!isJobSourceArray(existingSources)) {
    return NextResponse.json({ error: 'Invalid existing source list' }, { status: 400 })
  }

  try {
    const raw = await callStructuredLLM({
      systemPrompt: SOURCE_DISCOVERY_SYSTEM_PROMPT,
      userPrompt: buildUserPrompt(existingSources),
      schemaName: 'stamp4_source_discovery',
      schema: SUGGESTION_SCHEMA,
    })
    const parsed = JSON.parse(raw) as { suggestions?: unknown }
    const suggestions = Array.isArray(parsed.suggestions) ? parsed.suggestions.filter(isSuggestedSource) : []

    return NextResponse.json(suggestions)
  } catch (error) {
    console.warn('Stamp4 source discovery failed', error)
    return NextResponse.json({ error: 'Source discovery unavailable' }, { status: 503 })
  }
}


