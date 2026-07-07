import { NextResponse } from 'next/server'
import { checkAccessSecret, unauthorizedResponse } from '@/lib/stamp4/simple-apply/checkAccessSecret'
import {
  buildInterviewPrepUserPrompt,
  INTERVIEW_PREP_SYSTEM_PROMPT,
  isInterviewPrepOutput,
  type InterviewPrepOutput,
} from '@/lib/stamp4/simple-apply/generator'
import { callOpenAIJson } from '@/lib/stamp4/simple-apply/openai'
import type { ParsedJob, ProofMapping, ScoreBreakdown } from '@/lib/stamp4/simple-apply/types'

export const runtime = 'nodejs'

type InterviewPrepRequest = {
  parsed: ParsedJob
  score: ScoreBreakdown
  proofs: ProofMapping[]
}

const INTERVIEW_PREP_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['questions'],
  properties: {
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
  },
} as const

function isInterviewPrepRequest(value: unknown): value is InterviewPrepRequest {
  if (!value || typeof value !== 'object') return false
  const request = value as InterviewPrepRequest
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

  if (!isInterviewPrepRequest(body)) {
    return NextResponse.json({ error: 'Invalid interview prep request' }, { status: 400 })
  }

  const input = {
    parsed: body.parsed,
    score: body.score,
    proofs: body.proofs,
  }

  try {
    const raw = await callOpenAIJson({
      systemPrompt: INTERVIEW_PREP_SYSTEM_PROMPT,
      userPrompt: buildInterviewPrepUserPrompt(input),
      schemaName: 'stamp4_simple_apply_interview_prep',
      schema: INTERVIEW_PREP_SCHEMA,
    })
    const parsed = JSON.parse(raw) as unknown

    if (!isInterviewPrepOutput(parsed)) {
      return NextResponse.json({ error: 'AI response did not match expected shape' }, { status: 502 })
    }

    return NextResponse.json(parsed satisfies InterviewPrepOutput)
  } catch (error) {
    console.warn('Stamp4 interview prep generation failed', error)
    return NextResponse.json({ error: 'Interview prep generation unavailable' }, { status: 503 })
  }
}
