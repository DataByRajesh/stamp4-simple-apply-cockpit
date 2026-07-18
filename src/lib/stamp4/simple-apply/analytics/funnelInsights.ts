import type { SponsorshipStatus, TrackedJob } from '../types'

const APPLIED = new Set<TrackedJob['status']>(['Applied', 'Follow-up', 'Recruiter Screen', 'Interview', 'Final Stage', 'Offer', 'Rejected'])
const RESPONDED = new Set<TrackedJob['status']>(['Recruiter Screen', 'Interview', 'Final Stage', 'Offer'])
const INTERVIEWED = new Set<TrackedJob['status']>(['Interview', 'Final Stage', 'Offer'])

export interface SegmentInsight { label: string; tracked: number; applied: number; responses: number; interviews: number; applicationRate: number; responseRate: number; interviewRate: number }
export interface BottleneckInsight { severity: 'High' | 'Medium' | 'Low'; title: string; evidence: string; action: string }

function rate(part: number, whole: number) { return whole ? Math.round((part / whole) * 100) : 0 }
function reached(job: TrackedJob, set: Set<TrackedJob['status']>) { return set.has(job.status) }

function segment(label: string, jobs: TrackedJob[]): SegmentInsight {
  const applied = jobs.filter((job) => reached(job, APPLIED)).length
  const responses = jobs.filter((job) => reached(job, RESPONDED)).length
  const interviews = jobs.filter((job) => reached(job, INTERVIEWED)).length
  return { label, tracked: jobs.length, applied, responses, interviews, applicationRate: rate(applied, jobs.length), responseRate: rate(responses, applied), interviewRate: rate(interviews, applied) }
}

function group(jobs: TrackedJob[], key: (job: TrackedJob) => string): SegmentInsight[] {
  const grouped = new Map<string, TrackedJob[]>()
  for (const job of jobs) { const label = key(job); grouped.set(label, [...(grouped.get(label) ?? []), job]) }
  return [...grouped].map(([label, items]) => segment(label, items)).sort((a, b) => b.tracked - a.tracked || b.interviewRate - a.interviewRate)
}

export function computeFunnelInsights(jobs: TrackedJob[]) {
  const overall = segment('All tracked roles', jobs)
  const contacted = jobs.filter((job) => job.outreach?.responseStatus && job.outreach.responseStatus !== 'Not contacted').length
  const replied = jobs.filter((job) => job.outreach?.responseStatus === 'Replied').length
  const overdue = jobs.filter((job) => {
    const outreach = job.outreach
    return Boolean(outreach?.followUpDate && outreach.followUpDate < new Date().toISOString().slice(0, 10) && !['Replied', 'Declined'].includes(outreach.responseStatus))
  }).length
  const countries = group(jobs, (job) => job.country.trim() || 'Country unclear')
  const sponsorship = group(jobs, (job) => (job.sponsorshipStatus ?? 'Unknown') as SponsorshipStatus)
  const recommendations: BottleneckInsight[] = []

  if (overall.applicationRate < 50) recommendations.push({ severity: 'High', title: 'Application execution gap', evidence: `Only ${overall.applicationRate}% of tracked roles have reached application.`, action: 'Prioritise qualified roles with deadlines and submit the top five before adding more leads.' })
  if (overall.applied >= 5 && overall.responseRate < 20) recommendations.push({ severity: 'High', title: 'Low employer response', evidence: `${overall.responses} responses from ${overall.applied} applications (${overall.responseRate}%).`, action: 'Tighten role fit and CV proof, then add recruiter or hiring-manager outreach within 24 hours of applying.' })
  if (overall.responses >= 3 && rate(overall.interviews, overall.responses) < 50) recommendations.push({ severity: 'High', title: 'Screen-to-interview leakage', evidence: `${overall.interviews} interviews from ${overall.responses} employer responses.`, action: 'Practise the 60-second introduction, sponsorship answer and three proof stories before every recruiter screen.' })
  if (contacted < overall.applied * 0.6) recommendations.push({ severity: 'Medium', title: 'Outreach coverage is low', evidence: `${contacted} of ${overall.applied} applications have recorded outreach.`, action: 'Find one relevant recruiter, hiring manager or referral contact for each priority application.' })
  if (overdue > 0) recommendations.push({ severity: 'High', title: 'Follow-ups are overdue', evidence: `${overdue} outreach follow-up${overdue === 1 ? ' is' : 's are'} overdue.`, action: 'Clear overdue follow-ups first; use a short value-led message and record the response.' })
  if (contacted >= 3 && rate(replied, contacted) < 20) recommendations.push({ severity: 'Medium', title: 'Outreach message needs refinement', evidence: `${replied} replies from ${contacted} recorded outreach attempts.`, action: 'Lead with one role-specific proof point and one concise question instead of a general job request.' })
  if (!recommendations.length) recommendations.push({ severity: 'Low', title: 'No major bottleneck yet', evidence: 'Current conversion signals are within the working thresholds.', action: 'Keep tracking every stage and review again after five more applications.' })

  return { overall, countries, sponsorship, contacted, replied, overdue, recommendations }
}