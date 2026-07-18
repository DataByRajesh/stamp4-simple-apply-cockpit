import type { TrackerStatus } from './types'

const STATUSES: TrackerStatus[] = ['Saved','Qualified','Contacted','Applied','Follow-up','Recruiter Screen','Interview','Final Stage','Offer','Rejected','Archived']
const SPONSORSHIP = ['Unknown','Confirmed','Likely','Recruiter confirmation required','Authorised candidates only','No sponsorship']
const DECISIONS = ['Apply Now','Apply with Proof Fix','Save / Low Priority','Skip']
const MAX_SHORT = 500
const MAX_LONG = 50_000

function object(value: unknown): value is Record<string, unknown> { return Boolean(value) && typeof value === 'object' && !Array.isArray(value) }
function text(value: unknown, max = MAX_SHORT) { return typeof value === 'string' && value.length <= max }
function optionalText(value: unknown, max = MAX_SHORT) { return value === undefined || text(value, max) }
function date(value: unknown) { return value === undefined || value === '' || (typeof value === 'string' && value.length <= 30 && !Number.isNaN(Date.parse(value))) }
function workflow(value: unknown) { return value === undefined || (object(value) && JSON.stringify(value).length <= MAX_LONG && Object.values(value).every((entry) => typeof entry === 'string')) }

export function validateTrackerPost(value: unknown): string | null {
  if (!object(value)) return 'Job must be an object'
  if (!text(value.id, 200) || !text(value.company) || !text(value.roleTitle)) return 'Missing or invalid job identity'
  if (typeof value.score !== 'number' || value.score < 0 || value.score > 5) return 'Invalid score'
  if (!DECISIONS.includes(String(value.decision)) || !STATUSES.includes(value.status as TrackerStatus)) return 'Invalid decision or status'
  if (!date(value.dateAdded) || !optionalText(value.notes, MAX_LONG)) return 'Invalid date or notes'
  return null
}

export function validateTrackerPatch(value: unknown): string | null {
  if (!object(value) || !text(value.id, 200)) return 'Missing or invalid id'
  if (value.status !== undefined && !STATUSES.includes(value.status as TrackerStatus)) return 'Invalid status'
  if (value.sponsorshipStatus !== undefined && !SPONSORSHIP.includes(String(value.sponsorshipStatus))) return 'Invalid sponsorship status'
  if (!optionalText(value.notes, MAX_LONG) || !optionalText(value.sponsorshipEvidence, 5_000) || !optionalText(value.applicationUrl, 2_000)) return 'Text field is invalid or too long'
  if (!date(value.applicationDeadline)) return 'Invalid application deadline'
  for (const key of ['outreach','applicationRecord','interviewExecution','offerDecision']) if (!workflow(value[key])) return `Invalid ${key}`
  return null
}