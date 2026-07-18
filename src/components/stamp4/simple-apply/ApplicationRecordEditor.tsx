'use client'
import type { ApplicationRecord, TrackedJob } from '@/lib/stamp4/simple-apply/types'
export const EMPTY_APPLICATION_RECORD: ApplicationRecord = { cvVersion:'', coverLetterVersion:'', jdSnapshot:'', submittedAt:'', confirmationNumber:'', portalUrl:'', deadline:'', proofPoints:'', missingActions:'', interviewMaterialsUrl:'' }
export function ApplicationRecordEditor({job,onChange,onSave}:{job:TrackedJob;onChange:(v:ApplicationRecord)=>void;onSave:(v:ApplicationRecord)=>void}){
 const record={...EMPTY_APPLICATION_RECORD,...job.applicationRecord}; const field=<K extends keyof ApplicationRecord>(k:K,v:ApplicationRecord[K])=>onChange({...record,[k]:v}); const save=()=>onSave(record)
 return <div className="stack"><div className="form-grid">
  <label>CV version<input className="input" value={record.cvVersion} onChange={e=>field('cvVersion',e.target.value)} onBlur={save}/></label>
  <label>Cover-letter version<input className="input" value={record.coverLetterVersion} onChange={e=>field('coverLetterVersion',e.target.value)} onBlur={save}/></label>
  <label>Submitted date<input className="input" type="date" value={record.submittedAt} onChange={e=>field('submittedAt',e.target.value)} onBlur={save}/></label>
  <label>Confirmation/reference<input className="input" value={record.confirmationNumber} onChange={e=>field('confirmationNumber',e.target.value)} onBlur={save}/></label>
  <label>Portal URL<input className="input" type="url" value={record.portalUrl} onChange={e=>field('portalUrl',e.target.value)} onBlur={save}/></label>
  <label>Deadline<input className="input" type="date" value={record.deadline} onChange={e=>field('deadline',e.target.value)} onBlur={save}/></label>
  <label>Interview materials URL<input className="input" type="url" value={record.interviewMaterialsUrl} onChange={e=>field('interviewMaterialsUrl',e.target.value)} onBlur={save}/></label>
 </div>
 <label>Job-description snapshot<textarea className="textarea" rows={6} value={record.jdSnapshot} onChange={e=>field('jdSnapshot',e.target.value)} onBlur={save}/></label>
 <label>Proof points submitted<textarea className="textarea" rows={4} value={record.proofPoints} onChange={e=>field('proofPoints',e.target.value)} onBlur={save}/></label>
 <label>Missing documents or actions<textarea className="textarea" rows={3} value={record.missingActions} onChange={e=>field('missingActions',e.target.value)} onBlur={save}/></label>
 </div>
}