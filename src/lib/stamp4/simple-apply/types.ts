export interface CandidateEvidenceProfile {
  careerSummary: string
  achievements: string
  projects: string
  toolsAndDomains: string
  starStories: string
  permitAndAvailability: string
  salaryAndRelocation: string
  cvBulletLibrary: string
  evidenceGaps: string
}
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
  seniorityFit: number
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

export type InterviewStage = 'Phone Screen' | 'Technical / Panel' | 'Final Round'

export interface DeepInterviewQuestion extends InterviewQuestion {
  stage: InterviewStage
}

export interface QuestionToAsk {
  question: string
  whyAsk: string
}

export interface SalaryNegotiationPrep {
  talkingPoints: string[]
  suggestedRange: string
  notes: string
}

export interface InterviewPrepBundle {
  questions: DeepInterviewQuestion[]
  questionsToAsk: QuestionToAsk[]
  salaryNegotiation: SalaryNegotiationPrep
}

export interface CorrectionAction {
  action: string
  whyItMatters: string
  priority: 'High' | 'Medium' | 'Low'
}

export type TrackerStatus =
  | 'Saved'
  | 'Qualified'
  | 'Contacted'
  | 'Applied'
  | 'Follow-up'
  | 'Recruiter Screen'
  | 'Interview'
  | 'Final Stage'
  | 'Offer'
  | 'Rejected'
  | 'Archived'

export interface BackupPayload {
  exportedAt: string
  trackedJobs: unknown[]
  customJobSources: unknown[]
  alertSetupStatus: unknown[]
  appSettings: unknown[]
}

export interface SeenSponsorPosting {
  companyName: string
  externalId: string
  title: string
  url: string
  location: string | null
  scoreTotal: number | null
  decision: string | null
  descriptionText: string | null
  firstSeenAt: string
}

export type SponsorshipStatus = 'Unknown' | 'Confirmed' | 'Likely' | 'Recruiter confirmation required' | 'Authorised candidates only' | 'No sponsorship'

export type OutreachType = 'Recruiter' | 'Hiring manager' | 'Referral' | 'Alumni' | 'Other'
export type OutreachResponseStatus = 'Not contacted' | 'Sent' | 'Replied' | 'No response' | 'Declined'
export type ReferralStatus = 'Not requested' | 'Requested' | 'Confirmed' | 'Declined'

export interface OutreachDetails {
  contactName: string
  contactRole: string
  contactUrl: string
  outreachType: OutreachType
  firstContactDate: string
  followUpDate: string
  responseStatus: OutreachResponseStatus
  referralStatus: ReferralStatus
  messageDraft: string
}

export interface ApplicationRecord {
  cvVersion: string
  coverLetterVersion: string
  jdSnapshot: string
  submittedAt: string
  confirmationNumber: string
  portalUrl: string
  deadline: string
  proofPoints: string
  missingActions: string
  interviewMaterialsUrl: string
}
export interface InterviewExecution {
  scheduledAt: string
  timezone: string
  stage: string
  format: string
  interviewers: string
  preparationChecklist: string
  starStories: string
  sponsorshipAnswer: string
  salaryAnswer: string
  thankYouSentAt: string
  followUpDate: string
  outcome: string
  feedback: string
  lessonsLearned: string
}
export interface OfferDecision {
  baseSalary: string
  bonusEquityBenefits: string
  estimatedNetPay: string
  monthlyLivingCost: string
  sponsorshipCommitment: string
  permitRoute: string
  contractRisks: string
  relocationSupport: string
  relocationExpenses: string
  offerDeadline: string
  negotiationStatus: string
  documentChecklist: string
  weightedScore: string
  decision: string
  decisionReason: string
  onboardingTimeline: string
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
  updatedAt?: string
  applicationUrl?: string
  applicationDeadline?: string
  sponsorshipStatus?: SponsorshipStatus
  sponsorshipEvidence?: string
  outreach?: OutreachDetails
  applicationRecord?: ApplicationRecord
  interviewExecution?: InterviewExecution
  offerDecision?: OfferDecision
  notes: string
  generatedPack: ApplicationPack
  proofMap: ProofMapping[]
  correctionActions: CorrectionAction[]
  parsedJob?: ParsedJob
}



