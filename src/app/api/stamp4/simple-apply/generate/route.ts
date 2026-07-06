import { NextResponse } from 'next/server'
import { checkAccessSecret, unauthorizedResponse } from '@/lib/stamp4/simple-apply/checkAccessSecret'
import {
  buildAIUserPrompt,
  isAIGenerationOutput,
  SYSTEM_PROMPT,
  type AIGenerationOutput,
} from '@/lib/stamp4/simple-apply/generator'
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

function extractOutputText(data: unknown) {
  if (!data || typeof data !== 'object') return null
  const response = data as { output_text?: unknown; output?: Array<{ content?: Array<{ text?: unknown }> }> }

  if (typeof response.output_text === 'string') return response.output_text

  for (const item of response.output ?? []) {
    for (const content of item.content ?? []) {
      if (typeof content.text === 'string') return content.text
    }
  }

  return null
}

async function callAI(systemPrompt: string, userPrompt: string): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) throw new Error('OPENAI_API_KEY is not configured')

  const body = {
    model: process.env.OPENAI_MODEL ?? 'gpt-4.1-mini',
    input: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    text: {
      format: {
        type: 'json_schema',
        name: 'stamp4_simple_apply_generation',
        strict: true,
        schema: GENERATION_SCHEMA,
      },
    },
  }

  let lastError: unknown

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const response = await fetch('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      })

      if (!response.ok) {
        throw new Error(`OpenAI request failed with ${response.status}: ${await response.text()}`)
      }

      const text = extractOutputText(await response.json())
      if (!text) throw new Error('OpenAI response did not include output text')

      return text
    } catch (error) {
      lastError = error
    }
  }

  throw lastError instanceof Error ? lastError : new Error('OpenAI request failed')
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

  const input = {
    parsed: body.parsed,
    score: body.score,
    proofs: body.proofs,
  }

  try {
    const raw = await callAI(SYSTEM_PROMPT, buildAIUserPrompt(input))
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

