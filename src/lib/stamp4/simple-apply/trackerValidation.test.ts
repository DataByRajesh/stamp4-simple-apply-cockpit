import { describe, expect, it } from 'vitest'
import { validateTrackerPatch, validateTrackerPost } from './trackerValidation'

describe('tracker runtime validation', () => {
  it('rejects invalid pipeline status', () => expect(validateTrackerPatch({ id: '1', status: 'Hacked' })).toBe('Invalid status'))
  it('rejects non-object workflow records', () => expect(validateTrackerPatch({ id: '1', outreach: 'bad' })).toBe('Invalid outreach'))
  it('accepts a valid workflow patch', () => expect(validateTrackerPatch({ id: '1', status: 'Interview', applicationDeadline: '2026-08-01', outreach: { contactName: 'Alex' } })).toBeNull())
  it('rejects malformed job inserts', () => expect(validateTrackerPost({ id: '1' })).toBe('Missing or invalid job identity'))
})