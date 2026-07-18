import { NextResponse } from 'next/server'
import { checkAccessSecret, unauthorizedResponse } from '@/lib/stamp4/simple-apply/checkAccessSecret'
import {
  buildAIUserPrompt,
  isAIGenerationOutput,
  SYSTEM_PROMPT,
  type AIGenerationOutput,
} from '@/lib/stamp4/simple-apply/generator'
import { callOpenAIJson } from '@/lib/stamp4/simple-apply/openai'
import { getSupabaseServer } from '@/lib/stamp4/simple-apply/supabaseServer'
import type { ParsedJob, ProofMapping, ScoreBreakdown } from '@/lib/stamp4/simple-apply/types'

export const runtime = 'nodejs'

type GenerationRequest = {
  parsed: ParsedJob
  score: ScoreBreakdown
  proofs: ProofMapping[]
}

const GENERATION_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['pack', 'questions', 'actions'],
  properties: {
    pack: {
      type: 'object',
      additionalProperties: false,
      required: [
        'tailoredCvSummary',
        'topCvBullets',
        'coverMessage',
        'recruiterLinkedInMessage',
        'whyMeAnswer',
        'projectProofParagraph',
      ],
      properties: {
        tailoredCvSummary: { type: 'string' },
        topCvBullets: {
          type: 'array',
          minItems: 5,
          maxItems: 5,
          items: { type: 'string' },
        },
        coverMessage: { type: 'string' },
        recruiterLinkedInMessage: { type: 'string' },
        whyMeAnswer: { type: 'string' },
        projectProofParagraph: { type: 'string' },
      },
    },
    questions: {
      type: 'array',
      minItems: 8,
      maxItems: 10,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['question', 'answerDirection', 'proofToMention', 'tamilAudioNote'],
        properties: {
          question: { type: 'string' },
          answerDirection: { type: 'string' },
          proofToMention: { type: 'string' },
          tamilAudioNote: { type: ['string', 'null'] },
        },
      },
    },
    actions: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['action', 'whyItMatters', 'priority'],
        properties: {
          action: { type: 'string' },
          whyItMatters: { type: 'string' },
          priority: { type: 'string', enum: ['High', 'Medium', 'Low'] },
        },
      },
    },
  },
} as const

function isGenerationRequest(value: unknown): value is GenerationRequest {
  if (!value || typeof value !== 'object') return false
  const request = value as GenerationRequest
  return Boolean(request.parsed && request.score && Array.isArray(request.proofs))
}

export async function POST(request: Request) {
  if (!checkAccessSecret(request)) return unauthorizedResponse()

  let body: unknown

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON request' }, { status: 400 })
  }

  if (!isGenerationRequest(body)) {
    return NextResponse.json({ error: 'Invalid generation request' }, { status: 400 })
  }

  const { data: settingsRows } = await getSupabaseServer().from('app_settings').select('key,value').in('key', ['candidate_evidence_profile', 'mobility_profile'])
  const settings = Object.fromEntries((settingsRows ?? []).map((row) => [row.key, row.value]))
  const evidenceProfile = settings.candidate_evidence_profile
  const mobilityProfile = settings.mobility_profile
  const candidateEvidence = [
    evidenceProfile && typeof evidenceProfile === 'object' ? 'Permanent evidence:\n' + Object.entries(evidenceProfile as Record<string, unknown>).map(([key, value]) => '- ' + key + ': ' + String(value)).join('\n') : '',
    mobilityProfile && typeof mobilityProfile === 'object' ? 'Current mobility and sponsorship settings:\n' + Object.entries(mobilityProfile as Record<string, unknown>).map(([key, value]) => '- ' + key + ': ' + String(value)).join('\n') : '',
  ].filter(Boolean).join('\n\n').slice(0, 30_000)

  const input = {
    parsed: body.parsed,
    score: body.score,
    proofs: body.proofs,
    candidateEvidence,
  }

  try {
    const raw = await callOpenAIJson({
      systemPrompt: SYSTEM_PROMPT,
      userPrompt: buildAIUserPrompt(input),
      schemaName: 'stamp4_simple_apply_generation',
      schema: GENERATION_SCHEMA,
    })
    const parsed = JSON.parse(raw) as unknown

    if (!isAIGenerationOutput(parsed)) {
      return NextResponse.json({ error: 'AI response did not match expected shape' }, { status: 502 })
    }

    return NextResponse.json(parsed satisfies AIGenerationOutput)
  } catch (error) {
    console.warn('Stamp4 AI generation failed', error)
    return NextResponse.json({ error: 'AI generation unavailable' }, { status: 503 })
  }
}

