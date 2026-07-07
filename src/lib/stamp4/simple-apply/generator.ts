import type {
  ApplicationPack,
  CorrectionAction,
  InterviewQuestion,
  ParsedJob,
  ProofMapping,
  ScoreBreakdown,
} from './types'

export interface AIGenerationInput {
  parsed: ParsedJob
  score: ScoreBreakdown
  proofs: ProofMapping[]
}

export interface AIGenerationOutput {
  pack: ApplicationPack
  questions: InterviewQuestion[]
  actions: CorrectionAction[]
}

export type GenerationSource = 'ai' | 'fallback'

export interface GenerationResult extends AIGenerationOutput {
  source: GenerationSource
}

export const EMPTY_APPLICATION_PACK: ApplicationPack = {
  tailoredCvSummary: '',
  topCvBullets: [],
  coverMessage: '',
  recruiterLinkedInMessage: '',
  whyMeAnswer: '',
  projectProofParagraph: '',
}

export const SYSTEM_PROMPT = `You are helping Raj, a FinTech systems/application analyst candidate, write application materials for Ireland/EU job applications.

Tone: UK English, practical, no hype, no fake claims, no invented experience. Only use the facts provided below. Raj will personally review and edit every output before use.

Raj's background, verified facts only:
- About 3 years software engineering at FIS in a regulated FinTech/banking environment
- SQL/data validation, UAT, application support and incident investigation
- Portfolio projects: PayGuard IE for payment reconciliation, SQL validation, UAT and defect evidence; RegPulse for EU FinTech regulatory readiness around DORA/PSD3/FiDA
- Founder of AutoTime AI, an AI automation product for jobseekers/SMEs`.trim()

function hasRequirement(proofs: ProofMapping[], requirement: string) {
  return proofs.some((proof) => proof.jdRequirement.toLowerCase().includes(requirement))
}

function companyName(company: string) {
  return company === 'Unknown company' ? 'your organisation' : company
}

function proofLines(proofs: ProofMapping[]) {
  return proofs.length
    ? proofs.map((proof) => `- ${proof.jdRequirement} -> ${proof.proofAsset} (${proof.howToUse})`).join('\n')
    : '- No direct proof mappings detected; keep claims conservative.'
}

export function buildAIUserPrompt(input: AIGenerationInput) {
  const fallbackActions = generateCorrectionActionsFallback(input.parsed, input.score, input.proofs)

  return `Job details:
- Role: ${input.parsed.roleTitle}
- Company: ${input.parsed.company}
- Country/location: ${input.parsed.country || 'unknown'} / ${input.parsed.location || 'unknown'}
- Salary: ${input.parsed.salary ?? 'not stated'}
- Decision: ${input.score.decision}
- Score: ${input.score.total}/100
- Matched domain keywords: ${input.parsed.domainKeywords.join(', ') || 'none'}
- Matched skills: ${input.parsed.requiredSkills.join(', ') || 'none'}
- Permit or sponsorship signals: ${input.parsed.sponsorshipSignals.join(', ') || 'none'}

Relevant proof mappings for this JD:
${proofLines(input.proofs)}

Deterministic correction-action candidates. You may polish wording, but do not add actions that are not grounded in these candidates:
${fallbackActions.length ? fallbackActions.map((action) => `- ${action.priority}: ${action.action} (${action.whyItMatters})`).join('\n') : '- None'}

Generate a JSON object with this exact shape:
{
  "pack": {
    "tailoredCvSummary": "2-3 sentence CV summary tailored to this JD",
    "topCvBullets": ["exactly 5 bullet points, each starting with an action verb"],
    "coverMessage": "short cover message, 150-200 words",
    "recruiterLinkedInMessage": "LinkedIn outreach message, under 100 words",
    "whyMeAnswer": "3-4 sentence spoken-style answer to why should we hire you",
    "projectProofParagraph": "one paragraph describing the most relevant proof project for this JD"
  },
  "questions": [
    {
      "question": "interview question",
      "answerDirection": "practical answer direction",
      "proofToMention": "specific proof asset",
      "tamilAudioNote": "'Add to Tamil TTS revision script' if this question deserves extra spoken-answer practice, otherwise null"
    }
  ],
  "actions": [
    {
      "action": "correction action",
      "whyItMatters": "why it matters",
      "priority": "High | Medium | Low"
    }
  ]
}

Rules:
- Return ONLY valid JSON.
- Make 8-10 interview questions.
- If payment/reconciliation/settlement is relevant, include this exact question: "How would you investigate a payment marked successful in the application but missing in settlement?"
- Only set tamilAudioNote to the revision-script note for questions that genuinely warrant extra spoken-answer practice (for example payment/reconciliation questions); set it to null for the rest. Do not add it to every question.
- Keep every claim grounded in the job details and proof mappings above.
- Do not alter the score, decision or parsed job fields.`.trim()
}

function isCorrectionAction(value: unknown): value is CorrectionAction {
  if (!value || typeof value !== 'object') return false
  const action = value as CorrectionAction
  return (
    typeof action.action === 'string' &&
    typeof action.whyItMatters === 'string' &&
    ['High', 'Medium', 'Low'].includes(action.priority)
  )
}

function isInterviewQuestion(value: unknown): value is InterviewQuestion {
  if (!value || typeof value !== 'object') return false
  const question = value as InterviewQuestion
  return (
    typeof question.question === 'string' &&
    typeof question.answerDirection === 'string' &&
    typeof question.proofToMention === 'string' &&
    (question.tamilAudioNote === undefined ||
      question.tamilAudioNote === null ||
      typeof question.tamilAudioNote === 'string')
  )
}

function isApplicationPack(value: unknown): value is ApplicationPack {
  if (!value || typeof value !== 'object') return false
  const pack = value as ApplicationPack
  return (
    typeof pack.tailoredCvSummary === 'string' &&
    Array.isArray(pack.topCvBullets) &&
    pack.topCvBullets.length === 5 &&
    pack.topCvBullets.every((bullet) => typeof bullet === 'string') &&
    typeof pack.coverMessage === 'string' &&
    typeof pack.recruiterLinkedInMessage === 'string' &&
    typeof pack.whyMeAnswer === 'string' &&
    typeof pack.projectProofParagraph === 'string'
  )
}

export function isAIGenerationOutput(value: unknown): value is AIGenerationOutput {
  if (!value || typeof value !== 'object') return false
  const output = value as AIGenerationOutput
  return (
    isApplicationPack(output.pack) &&
    Array.isArray(output.questions) &&
    output.questions.length >= 8 &&
    output.questions.length <= 10 &&
    output.questions.every(isInterviewQuestion) &&
    Array.isArray(output.actions) &&
    output.actions.every(isCorrectionAction)
  )
}

async function generateWithAI(input: AIGenerationInput): Promise<AIGenerationOutput> {
  const response = await fetch('/api/stamp4/simple-apply/generate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-stamp4-secret': process.env.NEXT_PUBLIC_STAMP4_ACCESS_SECRET ?? '',
    },
    body: JSON.stringify({ parsed: input.parsed, score: input.score, proofs: input.proofs }),
  })

  if (!response.ok) throw new Error(`AI generation unavailable: ${response.status}`)

  const data = await response.json()
  if (!isAIGenerationOutput(data)) throw new Error('AI generation returned invalid shape')

  return data
}

export async function generateApplicationOutputs(
  parsed: ParsedJob,
  score: ScoreBreakdown,
  proofs: ProofMapping[],
): Promise<GenerationResult> {
  const input = { parsed, score, proofs }

  try {
    const output = await generateWithAI(input)
    return { ...output, source: 'ai' }
  } catch {    return { ...generateApplicationOutputsFallback(parsed, score, proofs), source: 'fallback' }
  }
}

export function generateApplicationOutputsFallback(
  parsed: ParsedJob,
  score: ScoreBreakdown,
  proofs: ProofMapping[],
): AIGenerationOutput {
  return {
    pack: generateApplicationPackFallback(parsed, proofs),
    questions: generateInterviewQuestionsFallback(parsed, proofs),
    actions: generateCorrectionActionsFallback(parsed, score, proofs),
  }
}

export function generateApplicationPackFallback(parsed: ParsedJob, proofs: ProofMapping[]): ApplicationPack {
  const proofNames = proofs.slice(0, 2).map((proof) => proof.jdRequirement.toLowerCase())
  const summaryTail = proofNames.length ? ` Strongest proof areas: ${proofNames.join(' and ')}.` : ''
  const tailoredCvSummary =
    'FinTech systems/application analyst with FIS banking software experience, SQL/data validation exposure, UAT/application quality understanding, and practical payment workflow knowledge.' +
    summaryTail

  const bulletBank = [
    {
      key: 'payment',
      text: 'Mapped payment and settlement scenarios into practical reconciliation checks, including ID, amount, status and timestamp comparisons.',
    },
    {
      key: 'sql',
      text: 'Used SQL/data validation thinking to investigate duplicate records, mismatch patterns and reporting inconsistencies.',
    },
    {
      key: 'uat',
      text: 'Built UAT-style test cases, defect notes and acceptance evidence for application quality review.',
    },
    {
      key: 'incident',
      text: 'Approached application support issues by checking logs, database records, workflow state and user-reported symptoms.',
    },
    {
      key: 'regulatory',
      text: 'Created RegPulse to structure EU FinTech regulatory readiness around DORA, PSD3 and FiDA evidence tracking.',
    },
    {
      key: 'stakeholder',
      text: 'Translated business requirements into clear system behaviour, validation rules and delivery-ready notes.',
    },
  ]

  const matchedBullets = bulletBank.filter((bullet) =>
    proofs.some((proof) => proof.jdRequirement.toLowerCase().includes(bullet.key)),
  )
  const topCvBullets = [...matchedBullets, ...bulletBank]
    .filter((bullet, index, array) => array.findIndex((item) => item.text === bullet.text) === index)
    .slice(0, 5)
    .map((bullet) => bullet.text)

  const roleTitle = parsed.roleTitle || 'the role'
  const company = companyName(parsed.company)
  const primaryProof = proofs[0]?.jdRequirement ?? 'systems analysis and application quality'
  const secondaryProof = proofs[1]?.jdRequirement ?? 'FinTech application support'

  return {
    tailoredCvSummary,
    topCvBullets,
    coverMessage: `Hello ${company} team,\n\nI am interested in the ${roleTitle} position because it sits close to my target lane: FinTech systems/application analysis, payment workflow understanding, SQL/data validation and UAT-quality evidence. My FIS banking software background and focused PayGuard IE/RegPulse project work give me practical proof for the system investigation, validation and stakeholder-facing parts of this role.\n\nI would welcome the chance to discuss where my experience can support the team while I continue building in the Ireland/EU FinTech systems space.`,
    recruiterLinkedInMessage: `Hi, I saw the ${roleTitle} role at ${company}. My background is FIS banking software plus SQL/data validation, UAT and payment workflow proof through PayGuard IE. I am focusing on Ireland/EU FinTech systems/application analyst roles and would be glad to discuss fit.`,
    whyMeAnswer: `My fit is strongest where the role needs practical system investigation rather than generic business analysis. I can connect ${primaryProof} with ${secondaryProof}, and explain the evidence clearly through PayGuard IE or RegPulse. I would still review the exact product context, but the core lane matches my FIS banking software and application-quality background.`,
    projectProofParagraph:
      hasRequirement(proofs, 'regulatory') &&
      !hasRequirement(proofs, 'payment') &&
      !hasRequirement(proofs, 'sql') &&
      !hasRequirement(proofs, 'uat')
        ? 'RegPulse is my EU FinTech regulatory readiness dashboard. It organises DORA/PSD3/FiDA themes into control evidence, readiness status and stakeholder review notes, which helps show structured compliance thinking without claiming direct regulatory ownership.'
        : 'PayGuard IE is my payment reconciliation proof project. It models payment versus settlement records and checks mismatches across ID, amount, status and timestamp, with SQL validation thinking, UAT cases and defect-style evidence that can be discussed in application analyst interviews.',
  }
}

export function generateInterviewQuestionsFallback(parsed: ParsedJob, proofs: ProofMapping[]): InterviewQuestion[] {
  const proof = (label: string) =>
    proofs.find((item) => item.jdRequirement.toLowerCase().includes(label))?.proofAsset ??
    proofs[0]?.proofAsset ??
    'FIS banking software experience'

  const questions: InterviewQuestion[] = []
  const text = parsed.rawText.toLowerCase()

  if (/payment|payments|reconciliation|settlement/.test(text)) {
    questions.push({
      question: 'How would you investigate a payment marked successful in the application but missing in settlement?',
      answerDirection:
        'Clarify the payment journey, compare application and settlement identifiers, check status transitions, query records, inspect logs and document a defect or operational finding.',
      proofToMention: proof('payment'),
      tamilAudioNote: 'Add to Tamil TTS revision script',
    })
  }

  const bank: InterviewQuestion[] = [
    {
      question: 'How do you turn a business requirement into a testable system rule?',
      answerDirection:
        'Restate the user need, identify data fields and workflow states, define expected behaviour, then create acceptance checks and edge cases.',
      proofToMention: proof('stakeholder'),
      tamilAudioNote: 'Add to Tamil TTS revision script',
    },
    {
      question: 'What SQL checks would you run when a report total does not match source records?',
      answerDirection:
        'Check filters, joins, duplicates, null handling, date ranges and sample records before documenting the mismatch.',
      proofToMention: proof('sql'),
      tamilAudioNote: 'Add to Tamil TTS revision script',
    },
    {
      question: 'How would you handle a defect raised during UAT?',
      answerDirection:
        'Reproduce the issue, capture steps and evidence, assess severity, link it to expected behaviour and retest after the fix.',
      proofToMention: proof('uat'),
    },
    {
      question: 'How do you prioritise application support issues?',
      answerDirection:
        'Separate business impact, user count, payment or compliance risk, workaround availability and reproducibility.',
      proofToMention: proof('application support'),
    },
    {
      question: 'How do you explain technical findings to a non-technical stakeholder?',
      answerDirection: 'Use the business outcome first, then the system cause, evidence, risk and proposed next step.',
      proofToMention: proof('stakeholder'),
    },
    {
      question: 'What makes a FinTech systems analyst different from a generic analyst?',
      answerDirection:
        'Emphasise transaction flows, controls, evidence, reconciliation, operational risk and accuracy of financial data.',
      proofToMention: proof('payment'),
    },
    {
      question: 'How would you approach a compliance-related application change?',
      answerDirection:
        'Map the regulatory or control need to data capture, workflow rules, audit evidence, test cases and stakeholder sign-off.',
      proofToMention: proof('regulatory'),
    },
    {
      question: 'What would you check before deciding this role is worth a full application?',
      answerDirection:
        'Confirm location, permit/sponsorship wording, salary range, product domain, systems responsibilities and proof gaps.',
      proofToMention: 'Stamp4 Simple Apply scoring and correction actions',
    },
  ]

  return [...questions, ...bank].slice(0, 10)
}

export function generateCorrectionActionsFallback(
  parsed: ParsedJob,
  score: ScoreBreakdown,
  proofs: ProofMapping[],
): CorrectionAction[] {
  const actions: CorrectionAction[] = []
  const text = parsed.rawText.toLowerCase()

  if (score.proofStrength < 15) {
    actions.push({
      action: 'Add one PayGuard IE reconciliation mismatch scenario',
      whyItMatters: 'The JD has too few directly mapped proof anchors for a strong application.',
      priority: 'High',
    })
  }

  if (text.includes('sql') && !proofs.some((proof) => proof.jdRequirement === 'SQL/data validation')) {
    actions.push({
      action: 'Prepare one SQL validation example',
      whyItMatters: 'SQL is mentioned but the current proof map does not make that evidence explicit.',
      priority: 'Medium',
    })
  }

  if (text.includes('uat') && score.proofStrength < 20) {
    actions.push({
      action: 'Practise UAT defect explanation',
      whyItMatters: 'A crisp UAT story will make the application quality angle more credible.',
      priority: 'Medium',
    })
  }

  if (score.permitFit < 10) {
    actions.push({
      action: 'Save job for later - sponsorship/permit fit unclear',
      whyItMatters: 'Permit risk is high enough that a full application may not be worth immediate effort.',
      priority: 'High',
    })
  }

  if (parsed.salary === null) {
    actions.push({
      action: 'Flag salary as unknown - confirm before investing full application effort',
      whyItMatters: "Salary clarity helps avoid spending time on a role outside Raj's target range.",
      priority: 'Low',
    })
  }

  return actions
}


