import type { CareerMobilityProfile } from './profile'
import type {
  ApplicationPack,
  CorrectionAction,
  DeepInterviewQuestion,
  InterviewPrepBundle,
  InterviewQuestion,
  InterviewStage,
  ParsedJob,
  ProofMapping,
  QuestionToAsk,
  SalaryNegotiationPrep,
  ScoreBreakdown,
  StarAnswerOutline,
} from './types'

export interface AIGenerationInput {
  candidateEvidence?: string
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

// Deliberately carries no candidate biography of its own - the real facts
// (career summary, achievements, projects) come from the candidate's own
// CandidateEvidenceProfile, passed in the user prompt's "Candidate evidence
// library" section (see buildAIUserPrompt/buildInterviewPrepUserPrompt).
// Baking a specific person's background into this constant would make the
// AI assert someone else's employment history as fact for every other
// candidate who uses this - the exact "no invented experience" rule below
// would otherwise be violated by the prompt itself.
export const SYSTEM_PROMPT = `You are helping a job candidate write application materials for their target roles.

Tone: UK English, practical, no hype, no fake claims, no invented experience beyond what the candidate has stated themselves. Only use the facts provided in the candidate evidence library and job details below - never assert a background, employer, or project the candidate has not stated. The candidate will personally review and edit every output before use.`.trim()

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
- Score: ${input.score.total}/5
- Matched domain keywords: ${input.parsed.domainKeywords.join(', ') || 'none'}
- Matched skills: ${input.parsed.requiredSkills.join(', ') || 'none'}
- Permit or sponsorship signals: ${input.parsed.sponsorshipSignals.join(', ') || 'none'}
- Seniority signals: ${input.parsed.senioritySignals.join(', ') || 'none'}

Candidate evidence library (verified by the candidate; use only these claims and the fixed verified facts):
${input.candidateEvidence || '- No additional candidate evidence saved.'}

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

export const INTERVIEW_PREP_SYSTEM_PROMPT = `${SYSTEM_PROMPT}

For this task you are producing a full interview prep bundle, not just a question bank: the questions the candidate is likely to be asked (tagged by interview stage), good questions for the candidate to ask the interviewer, and grounded salary-negotiation talking points. Every question must be genuinely tailored to the exact job details and proof mappings supplied: reference specific responsibilities, tools, domain keywords, seniority signals or proof assets from that job. Do not produce generic, could-apply-to-any-analyst-role questions - each one should read as if written by someone who read this exact JD closely and is testing the candidate against it specifically.`.trim()

function salaryContextLines(profile: CareerMobilityProfile) {
  return `- Candidate's target salary range: EUR ${profile.salaryTargetRangeEUR.min.toLocaleString()}-${profile.salaryTargetRangeEUR.max.toLocaleString()}
- Candidate's minimum permit-eligible salary floor: EUR ${profile.salaryPermitFloorEUR.toLocaleString()}`
}

export function buildInterviewPrepUserPrompt(input: AIGenerationInput, careerProfile: CareerMobilityProfile) {
  return `Job details:
- Role: ${input.parsed.roleTitle}
- Company: ${input.parsed.company}
- Country/location: ${input.parsed.country || 'unknown'} / ${input.parsed.location || 'unknown'}
- Salary stated in JD: ${input.parsed.salary ?? 'not stated'}
- Decision: ${input.score.decision}
- Score: ${input.score.total}/5
- Responsibilities: ${input.parsed.responsibilities.join('; ') || 'none stated'}
- Matched domain keywords: ${input.parsed.domainKeywords.join(', ') || 'none'}
- Matched skills: ${input.parsed.requiredSkills.join(', ') || 'none'}
- Tools: ${input.parsed.tools.join(', ') || 'none'}
- Seniority signals: ${input.parsed.senioritySignals.join(', ') || 'none'}

Candidate evidence library (verified by the candidate; use only these claims and the fixed verified facts):
${input.candidateEvidence || '- No additional candidate evidence saved.'}

Relevant proof mappings for this JD:
${proofLines(input.proofs)}

Candidate's salary context (for negotiation prep only - do not restate as fact about this specific offer):
${salaryContextLines(careerProfile)}

Generate a JSON object with this exact shape:
{
  "questions": [
    {
      "question": "interview question",
      "stage": "Phone Screen | Technical / Panel | Final Round",
      "answerDirection": "practical answer direction",
      "starOutline": {
        "situation": "1 short sentence: the specific context to open with, grounded in a named proof asset",
        "task": "1 short sentence: what the candidate was responsible for in that context",
        "action": "1-2 short sentences: the concrete steps the candidate took - this is the main substance of the answer",
        "result": "1 short sentence: the outcome, ideally with a concrete detail (a number, a fix, a decision made)"
      },
      "likelyFollowUp": "the single most likely probing follow-up an interviewer would ask after hearing this answer, testing depth rather than repeating the original question",
      "proofToMention": "specific proof asset",
      "tamilAudioNote": "'Add to Tamil TTS revision script' if this question deserves extra spoken-answer practice, otherwise null"
    }
  ],
  "questionsToAsk": [
    {
      "question": "a good question for the candidate to ask the interviewer",
      "whyAsk": "one sentence on what this reveals or why it matters for this specific role"
    }
  ],
  "salaryNegotiation": {
    "talkingPoints": ["grounded talking point the candidate can use if salary comes up"],
    "suggestedRange": "a specific EUR range to anchor on for this role, reasoned from the candidate's target range and what the JD states",
    "notes": "1-2 sentences of role-specific negotiation context (e.g. permit/visa leverage considerations, seniority mismatch, salary not stated)"
  }
}

Rules:
- Return ONLY valid JSON.
- Make exactly 8-10 interview questions - high-level and genuinely tailored to this JD, not generic filler.
- Each question must reference at least one concrete detail from the job details above (a named responsibility, tool, domain keyword or proof asset) so it could not be reused unchanged for a different role.
- Tag every question with the stage it is most likely to appear in. Use a reasonable spread across all three stages rather than putting everything in one.
- Only build a starOutline when the question is answerable through a specific past example (most are). If a question is purely hypothetical/opinion-based with no natural STAR story (e.g. "what makes X different from Y"), still fill all four fields but keep them short and note the answer is more explanatory than story-based.
- likelyFollowUp must be a genuine probe, not a rephrase - e.g. asking for a number, a harder edge case, what the candidate would do differently, or how a stakeholder reacted.
- If payment/reconciliation/settlement is relevant, include this exact question tagged "Technical / Panel": "How would you investigate a payment marked successful in the application but missing in settlement?"
- Only set tamilAudioNote to the revision-script note for questions that genuinely warrant extra spoken-answer practice; set it to null for the rest.
- Make 4-6 questionsToAsk - genuinely specific to this company/role, not generic ("What's the culture like?" is not acceptable).
- Ground salaryNegotiation.suggestedRange and notes in the actual JD salary (if stated) versus the candidate's target range and permit floor above - do not invent a JD salary that was not given.
- Keep every claim grounded in the job details and proof mappings above.`.trim()
}

function isInterviewStage(value: unknown): value is InterviewStage {
  return value === 'Phone Screen' || value === 'Technical / Panel' || value === 'Final Round'
}

function isStarAnswerOutline(value: unknown): value is StarAnswerOutline {
  if (!value || typeof value !== 'object') return false
  const outline = value as StarAnswerOutline
  return (
    typeof outline.situation === 'string' &&
    typeof outline.task === 'string' &&
    typeof outline.action === 'string' &&
    typeof outline.result === 'string'
  )
}

function isDeepInterviewQuestion(value: unknown): value is DeepInterviewQuestion {
  if (!isInterviewQuestion(value)) return false
  const question = value as DeepInterviewQuestion
  return (
    isInterviewStage(question.stage) &&
    isStarAnswerOutline(question.starOutline) &&
    typeof question.likelyFollowUp === 'string'
  )
}

function isQuestionToAsk(value: unknown): value is QuestionToAsk {
  if (!value || typeof value !== 'object') return false
  const item = value as QuestionToAsk
  return typeof item.question === 'string' && typeof item.whyAsk === 'string'
}

function isSalaryNegotiationPrep(value: unknown): value is SalaryNegotiationPrep {
  if (!value || typeof value !== 'object') return false
  const prep = value as SalaryNegotiationPrep
  return (
    Array.isArray(prep.talkingPoints) &&
    prep.talkingPoints.every((point) => typeof point === 'string') &&
    typeof prep.suggestedRange === 'string' &&
    typeof prep.notes === 'string'
  )
}

export function isInterviewPrepOutput(value: unknown): value is InterviewPrepBundle {
  if (!value || typeof value !== 'object') return false
  const output = value as InterviewPrepBundle
  return (
    Array.isArray(output.questions) &&
    output.questions.length >= 8 &&
    output.questions.length <= 10 &&
    output.questions.every(isDeepInterviewQuestion) &&
    Array.isArray(output.questionsToAsk) &&
    output.questionsToAsk.length >= 4 &&
    output.questionsToAsk.length <= 6 &&
    output.questionsToAsk.every(isQuestionToAsk) &&
    isSalaryNegotiationPrep(output.salaryNegotiation)
  )
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

// Generic, category-level filler bullets used only to pad out to 5 when the
// candidate has fewer than 5 matched proofs for this JD - deliberately not
// naming any specific project/employer, since this path has no candidate
// evidence to draw a real bullet from for that category.
const GENERIC_BULLET_FILLERS: Record<string, string> = {
  'Payment reconciliation': 'Comfortable mapping payment and settlement scenarios into reconciliation checks (ID, amount, status, timestamp).',
  'SQL/data validation': 'Comfortable using SQL/data validation thinking to investigate duplicate records and mismatch patterns.',
  'UAT/testing': 'Comfortable building UAT-style test cases and defect evidence for application quality review.',
  'Application support/incident investigation': 'Comfortable approaching application support issues via logs, database records and workflow state.',
  'Regulatory/compliance awareness': 'Comfortable structuring regulatory/compliance evidence tracking.',
  'Stakeholder/business analysis': 'Comfortable translating business requirements into system behaviour and validation rules.',
}

/**
 * Non-AI fallback content, used only when the AI call fails. Built entirely
 * from `proofs` (the caller's own tagged evidence, already resolved
 * per-candidate by mapProofs) - never asserts a specific job title,
 * employer or project name, since this function has no candidate identity
 * to draw one from honestly. Quality is intentionally more generic than the
 * AI path in exchange for being correct for any candidate.
 */
export function generateApplicationPackFallback(parsed: ParsedJob, proofs: ProofMapping[]): ApplicationPack {
  const proofNames = proofs.slice(0, 2).map((proof) => proof.jdRequirement.toLowerCase())
  const summaryTail = proofNames.length ? ` Strongest proof areas: ${proofNames.join(' and ')}.` : ''
  const tailoredCvSummary =
    'Candidate with evidence-backed application analyst experience.' + summaryTail

  const matchedBullets = proofs.map((proof) => `${proof.jdRequirement}: ${proof.howToUse}`)
  const fillerBullets = Object.entries(GENERIC_BULLET_FILLERS)
    .filter(([requirement]) => !proofs.some((proof) => proof.jdRequirement === requirement))
    .map(([, text]) => text)
  const topCvBullets = [...matchedBullets, ...fillerBullets].slice(0, 5)

  const roleTitle = parsed.roleTitle || 'the role'
  const company = companyName(parsed.company)
  const primaryProof = proofs[0]?.jdRequirement ?? 'systems analysis and application quality'
  const secondaryProof = proofs[1]?.jdRequirement

  return {
    tailoredCvSummary,
    topCvBullets,
    coverMessage: `Hello ${company} team,\n\nI am interested in the ${roleTitle} position because it sits close to my target lane${secondaryProof ? `: ${primaryProof.toLowerCase()} and ${secondaryProof.toLowerCase()}` : ''}. I would welcome the chance to discuss where my experience can support the team.\n\nPlease review and personalise this message with your own specific evidence before sending.`,
    recruiterLinkedInMessage: `Hi, I saw the ${roleTitle} role at ${company}. My relevant background includes ${primaryProof.toLowerCase()}${secondaryProof ? ` and ${secondaryProof.toLowerCase()}` : ''}. I would be glad to discuss fit.`,
    whyMeAnswer: secondaryProof
      ? `My fit is strongest where the role needs ${primaryProof.toLowerCase()} and ${secondaryProof.toLowerCase()}. I would still review the exact product context, but the core lane matches my recorded evidence.`
      : `My fit is strongest where the role needs ${primaryProof.toLowerCase()}. I would still review the exact product context before finalising this answer.`,
    projectProofParagraph: proofs[0]
      ? `${proofs[0].proofAsset}. ${proofs[0].howToUse}`
      : 'No specific proof project matched this JD automatically - review your evidence library and add the most relevant project or achievement here yourself.',
  }
}

export function buildCompanyResearchChecklist(company: string, roleTitle: string, domainKeywords: string[]): string[] {
  const name = companyName(company)
  const role = roleTitle || 'this role'
  const hasPaymentsDomain = domainKeywords.some((keyword) =>
    ['payment', 'payments', 'reconciliation', 'settlement', 'fintech'].includes(keyword.toLowerCase()),
  )
  const hasComplianceDomain = domainKeywords.some((keyword) =>
    ['dora', 'psd3', 'fida', 'compliance', 'regulatory'].includes(keyword.toLowerCase()),
  )

  const checklist = [
    `What ${name} actually builds or sells - read the product/homepage copy yourself rather than relying on the job title alone.`,
    `Any recent funding round, acquisition or public news in the last 6 months - search "${name} news" and check the company's own blog or press page.`,
    `Their engineering or tech blog if one exists - gives real signal on tools, architecture and priorities beyond what the JD lists.`,
    `Why this role exists now - is it new headcount, backfill, a new market entry, or a specific known pain point? Worth asking directly if unclear.`,
    `Who is likely on the panel - check LinkedIn for the hiring manager or team, and note anything relevant to bring up (shared background, a project they posted about).`,
  ]

  if (hasPaymentsDomain) {
    checklist.push(
      `${name}'s specific position in the payments chain - are they a PSP, an issuer, a merchant, or infrastructure - since this changes what "reconciliation" and "settlement" mean in their context.`,
    )
  }

  if (hasComplianceDomain) {
    checklist.push(
      `Any public statement from ${name} on DORA, PSD3 or FiDA readiness - regulators and larger FinTechs often publish compliance posture updates worth referencing.`,
    )
  }

  checklist.push(`Reread the ${role} JD itself immediately before the interview - note two lines you have not yet prepared an answer for.`)

  return checklist
}

export function generateInterviewQuestionsFallback(parsed: ParsedJob, proofs: ProofMapping[]): InterviewQuestion[] {
  const proof = (label: string) =>
    proofs.find((item) => item.jdRequirement.toLowerCase().includes(label))?.proofAsset ??
    proofs[0]?.proofAsset ??
    'your relevant experience'

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

  if (score.proofStrength < 3.75) {
    actions.push({
      action: 'Add one concrete reconciliation/validation scenario to your evidence library',
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

  if (text.includes('uat') && score.proofStrength < 5) {
    actions.push({
      action: 'Practise UAT defect explanation',
      whyItMatters: 'A crisp UAT story will make the application quality angle more credible.',
      priority: 'Medium',
    })
  }

  if (score.permitFit < 2.5) {
    actions.push({
      action: 'Save job for later - sponsorship/permit fit unclear',
      whyItMatters: 'Permit risk is high enough that a full application may not be worth immediate effort.',
      priority: 'High',
    })
  }

  if (parsed.salary === null) {
    actions.push({
      action: 'Flag salary as unknown - confirm before investing full application effort',
      whyItMatters: "Salary clarity helps avoid spending time on a role outside the candidate's target range.",
      priority: 'Low',
    })
  }

  return actions
}


