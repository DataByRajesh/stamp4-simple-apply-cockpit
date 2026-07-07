import { describe, expect, it } from 'vitest'
import {
  generateApplicationPackFallback,
  generateCorrectionActionsFallback,
  generateInterviewQuestionsFallback,
  isAIGenerationOutput,
} from './generator'
import type { ParsedJob, ProofMapping, ScoreBreakdown } from './types'

function job(overrides: Partial<ParsedJob> = {}): ParsedJob {
  return {
    roleTitle: 'Systems Analyst',
    company: 'Acme',
    country: 'Ireland',
    location: 'Dublin',
    salary: '50000',
    requiredSkills: [],
    niceToHaveSkills: [],
    tools: [],
    domainKeywords: [],
    responsibilities: [],
    sponsorshipSignals: [],
    redFlags: [],
    senioritySignals: [],
    workPattern: null,
    rawText: '',
    ...overrides,
  }
}

function score(overrides: Partial<ScoreBreakdown> = {}): ScoreBreakdown {
  return {
    roleFit: 20,
    domainFit: 20,
    skillFit: 20,
    permitFit: 20,
    proofStrength: 20,
    seniorityFit: 20,
    total: 120,
    decision: 'Apply Now',
    ...overrides,
  }
}

function validAIOutput(overrides: { tamilAudioNote?: string | null } = {}) {
  const question = (tamilAudioNote: string | null | undefined) => ({
    question: 'q',
    answerDirection: 'a',
    proofToMention: 'p',
    tamilAudioNote,
  })

  return {
    pack: {
      tailoredCvSummary: 'summary',
      topCvBullets: ['a', 'b', 'c', 'd', 'e'],
      coverMessage: 'cover',
      recruiterLinkedInMessage: 'linkedin',
      whyMeAnswer: 'why',
      projectProofParagraph: 'proof',
    },
    questions: Array.from({ length: 8 }, (_, i) =>
      question(i === 0 ? (overrides.tamilAudioNote ?? 'note') : null),
    ),
    actions: [{ action: 'a', whyItMatters: 'w', priority: 'High' as const }],
  }
}

describe('isAIGenerationOutput', () => {
  it('accepts a well-formed output', () => {
    expect(isAIGenerationOutput(validAIOutput())).toBe(true)
  })

  it('accepts null for tamilAudioNote (the schema now allows omitting it per-question)', () => {
    expect(isAIGenerationOutput(validAIOutput({ tamilAudioNote: null }))).toBe(true)
  })

  it('rejects a numeric tamilAudioNote', () => {
    const output = validAIOutput()
    // @ts-expect-error - deliberately invalid for the test
    output.questions[0].tamilAudioNote = 42
    expect(isAIGenerationOutput(output)).toBe(false)
  })

  it('rejects fewer than 5 CV bullets', () => {
    const output = validAIOutput()
    output.pack.topCvBullets = ['a', 'b', 'c']
    expect(isAIGenerationOutput(output)).toBe(false)
  })

  it('rejects fewer than 8 interview questions', () => {
    const output = validAIOutput()
    output.questions = output.questions.slice(0, 5)
    expect(isAIGenerationOutput(output)).toBe(false)
  })

  it('rejects a completely malformed value', () => {
    expect(isAIGenerationOutput(null)).toBe(false)
    expect(isAIGenerationOutput({})).toBe(false)
    expect(isAIGenerationOutput('not an object')).toBe(false)
  })
})

describe('generateApplicationPackFallback', () => {
  it('always returns exactly 5 CV bullets and non-empty prose fields', () => {
    const pack = generateApplicationPackFallback(job(), [])

    expect(pack.topCvBullets).toHaveLength(5)
    expect(pack.tailoredCvSummary.length).toBeGreaterThan(0)
    expect(pack.coverMessage.length).toBeGreaterThan(0)
    expect(pack.recruiterLinkedInMessage.length).toBeGreaterThan(0)
  })
})

describe('generateInterviewQuestionsFallback', () => {
  it('includes the settlement-investigation question when payment language is present', () => {
    const questions = generateInterviewQuestionsFallback(job({ rawText: 'this role covers payment reconciliation' }), [])
    expect(questions.some((q) => q.question.includes('missing in settlement'))).toBe(true)
  })

  it('omits the settlement-investigation question when payment language is absent', () => {
    const questions = generateInterviewQuestionsFallback(job({ rawText: 'generic business analyst role' }), [])
    expect(questions.some((q) => q.question.includes('missing in settlement'))).toBe(false)
  })

  it('never returns more than 10 questions', () => {
    const questions = generateInterviewQuestionsFallback(job({ rawText: 'payment reconciliation settlement' }), [])
    expect(questions.length).toBeLessThanOrEqual(10)
  })
})

describe('generateCorrectionActionsFallback', () => {
  it('flags weak proof strength as a high-priority action', () => {
    const actions = generateCorrectionActionsFallback(job(), score({ proofStrength: 5 }), [])
    expect(actions.some((a) => a.action.includes('PayGuard IE') && a.priority === 'High')).toBe(true)
  })

  it('flags an unmapped SQL mention', () => {
    const proofs: ProofMapping[] = []
    const actions = generateCorrectionActionsFallback(job({ rawText: 'requires sql skills' }), score(), proofs)
    expect(actions.some((a) => a.action.includes('SQL validation example'))).toBe(true)
  })

  it('does not flag SQL when it is already mapped as a proof', () => {
    const proofs: ProofMapping[] = [{ jdRequirement: 'SQL/data validation', proofAsset: 'x', howToUse: 'y' }]
    const actions = generateCorrectionActionsFallback(job({ rawText: 'requires sql skills' }), score(), proofs)
    expect(actions.some((a) => a.action.includes('SQL validation example'))).toBe(false)
  })

  it('flags unclear permit fit and unknown salary', () => {
    const actions = generateCorrectionActionsFallback(job({ salary: null }), score({ permitFit: 5 }), [])
    expect(actions.some((a) => a.action.includes('sponsorship/permit fit unclear'))).toBe(true)
    expect(actions.some((a) => a.action.includes('Flag salary as unknown'))).toBe(true)
  })
})
