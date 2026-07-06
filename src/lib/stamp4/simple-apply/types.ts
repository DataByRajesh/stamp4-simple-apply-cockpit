export interface ParsedJob {
  roleTitle: string
  company: string
  country: string
  location: string
  salary: string | null
  requiredSkills: string[]
  niceToHaveSkills: string[]
  tools: string[]
  domainKeywords: string[]
  responsibilities: string[]
  sponsorshipSignals: string[]
  redFlags: string[]
  senioritySignals: string[]
  workPattern: string | null
  rawText: string
}

export interface ScoreBreakdown {
  roleFit: number
  domainFit: number
  skillFit: number
  permitFit: number
  proofStrength: number
  total: number
  decision: 'Apply Now' | 'Apply with Proof Fix' | 'Save / Low Priority' | 'Skip'
}

export interface ProofMapping {
  jdRequirement: string
  proofAsset: string
  howToUse: string
}

export interface ApplicationPack {
  tailoredCvSummary: string
  topCvBullets: string[]
  coverMessage: string
  recruiterLinkedInMessage: string
  whyMeAnswer: string
  projectProofParagraph: string
}

export interface InterviewQuestion {
  question: string
  answerDirection: string
  proofToMention: string
  tamilAudioNote?: string | null
}

export interface CorrectionAction {
  action: string
  whyItMatters: string
  priority: 'High' | 'Medium' | 'Low'
}

export type TrackerStatus =
  | 'Saved'
  | 'Applied'
  | 'Follow-up'
  | 'Interview'
  | 'Rejected'
  | 'Archived'

export interface BackupPayload {
  exportedAt: string
  trackedJobs: unknown[]
  customJobSources: unknown[]
  alertSetupStatus: unknown[]
  appSettings: unknown[]
}

export interface TrackedJob {
  id: string
  company: string
  roleTitle: string
  country: string
  location: string
  salary: string | null
  score: number
  decision: ScoreBreakdown['decision']
  scoreBreakdown?: ScoreBreakdown
  status: TrackerStatus
  dateAdded: string
  notes: string
  generatedPack: ApplicationPack
  proofMap: ProofMapping[]
  correctionActions: CorrectionAction[]
}
