import { describe, expect, it } from 'vitest'
import { buildNormalizedNameSet, isVerifiedSponsor, normalizeCompanyName } from './irelandSponsorRegister'

describe('normalizeCompanyName', () => {
  it('lowercases and strips punctuation', () => {
    expect(normalizeCompanyName('A & L Goodbody LLP')).toBe('a l goodbody')
  })

  it('strips common legal suffixes', () => {
    expect(normalizeCompanyName('Wayflyer Limited')).toBe('wayflyer')
    expect(normalizeCompanyName('Zyntech Solutions Ltd')).toBe('zyntech solutions')
    expect(normalizeCompanyName('A W Ennis Unlimited Company')).toBe('a w ennis')
  })

  it('collapses extra whitespace', () => {
    expect(normalizeCompanyName('  Foo   Bar  ')).toBe('foo bar')
  })
})

describe('buildNormalizedNameSet', () => {
  it('normalizes every name and drops empties', () => {
    const set = buildNormalizedNameSet(['Mastercard Payment Services (Ireland) Limited', '', '   '])
    expect(set.has('mastercard payment services ireland')).toBe(true)
    expect(set.size).toBe(1)
  })
})

describe('isVerifiedSponsor', () => {
  it('matches a brand name against the government full legal entity name', () => {
    const verified = buildNormalizedNameSet(['Mastercard Payment Services (Ireland) Limited'])
    expect(isVerifiedSponsor('Mastercard', verified)).toBe(true)
  })

  it('matches the other direction too (job company name longer than register entry)', () => {
    const verified = buildNormalizedNameSet(['Stripe'])
    expect(isVerifiedSponsor('Stripe Payments Europe Limited', verified)).toBe(true)
  })

  it('returns false for a company not in the register', () => {
    const verified = buildNormalizedNameSet(['Mastercard Payment Services (Ireland) Limited'])
    expect(isVerifiedSponsor('Totally Unrelated Corp', verified)).toBe(false)
  })

  it('returns false for an empty company name', () => {
    const verified = buildNormalizedNameSet(['Mastercard Payment Services (Ireland) Limited'])
    expect(isVerifiedSponsor('', verified)).toBe(false)
  })

  it('returns false against an empty register', () => {
    expect(isVerifiedSponsor('Mastercard', new Set())).toBe(false)
  })
})
