'use client'

import type { OutreachDetails, OutreachResponseStatus, OutreachType, ReferralStatus, TrackedJob } from '@/lib/stamp4/simple-apply/types'

const OUTREACH_TYPES: OutreachType[] = ['Recruiter', 'Hiring manager', 'Referral', 'Alumni', 'Other']
const RESPONSE_STATUSES: OutreachResponseStatus[] = ['Not contacted', 'Sent', 'Replied', 'No response', 'Declined']
const REFERRAL_STATUSES: ReferralStatus[] = ['Not requested', 'Requested', 'Confirmed', 'Declined']

export const EMPTY_OUTREACH: OutreachDetails = {
  contactName: '', contactRole: '', contactUrl: '', outreachType: 'Recruiter', firstContactDate: '',
  followUpDate: '', responseStatus: 'Not contacted', referralStatus: 'Not requested', messageDraft: '',
}

export function isFollowUpOverdue(outreach?: OutreachDetails): boolean {
  if (!outreach?.followUpDate || outreach.responseStatus === 'Replied' || outreach.responseStatus === 'Declined') return false
  const today = new Date().toISOString().slice(0, 10)
  return outreach.followUpDate < today
}

export function OutreachEditor({ job, onChange, onSave }: { job: TrackedJob; onChange: (value: OutreachDetails) => void; onSave: (value: OutreachDetails) => void }) {
  const outreach = { ...EMPTY_OUTREACH, ...job.outreach }
  const field = <K extends keyof OutreachDetails>(key: K, value: OutreachDetails[K]) => onChange({ ...outreach, [key]: value })
  const save = () => onSave(outreach)

  return (
    <div className="stack">
      <div className="form-grid">
        <label>Contact name<input className="input" value={outreach.contactName} onChange={(e) => field('contactName', e.target.value)} onBlur={save} /></label>
        <label>Contact role<input className="input" value={outreach.contactRole} onChange={(e) => field('contactRole', e.target.value)} onBlur={save} /></label>
        <label>Profile or channel URL<input className="input" type="url" placeholder="LinkedIn or email channel" value={outreach.contactUrl} onChange={(e) => field('contactUrl', e.target.value)} onBlur={save} /></label>
        <label>Outreach type<select className="select" value={outreach.outreachType} onChange={(e) => { const value = { ...outreach, outreachType: e.target.value as OutreachType }; onChange(value); onSave(value) }}>{OUTREACH_TYPES.map((v) => <option key={v}>{v}</option>)}</select></label>
        <label>First contact<input className="input" type="date" value={outreach.firstContactDate} onChange={(e) => field('firstContactDate', e.target.value)} onBlur={save} /></label>
        <label>Follow-up due<input className="input" type="date" value={outreach.followUpDate} onChange={(e) => field('followUpDate', e.target.value)} onBlur={save} /></label>
        <label>Response<select className="select" value={outreach.responseStatus} onChange={(e) => { const value = { ...outreach, responseStatus: e.target.value as OutreachResponseStatus }; onChange(value); onSave(value) }}>{RESPONSE_STATUSES.map((v) => <option key={v}>{v}</option>)}</select></label>
        <label>Referral<select className="select" value={outreach.referralStatus} onChange={(e) => { const value = { ...outreach, referralStatus: e.target.value as ReferralStatus }; onChange(value); onSave(value) }}>{REFERRAL_STATUSES.map((v) => <option key={v}>{v}</option>)}</select></label>
      </div>
      <label>Personalized outreach draft<textarea className="textarea" rows={5} value={outreach.messageDraft} onChange={(e) => field('messageDraft', e.target.value)} onBlur={save} /></label>
    </div>
  )
}