import { describe, expect, it } from 'vitest'
import { matchedDomainSectors, RAJ_PROFILE } from './profile'

describe('matchedDomainSectors', () => {
  it('returns no sectors when no keywords matched', () => {
    expect(matchedDomainSectors([])).toEqual([])
  })

  it('returns one sector name for keywords within a single sector', () => {
    expect(matchedDomainSectors(['kyc', 'aml', 'compliance'])).toEqual(['Risk, Compliance & RegTech'])
  })

  it('returns multiple sector names when keywords span sectors', () => {
    const sectors = matchedDomainSectors(['fintech', 'banking', 'risk'])
    expect(sectors).toEqual(
      expect.arrayContaining(['Payments & Transactions', 'Banking & Financial Services', 'Risk, Compliance & RegTech']),
    )
  })

  it('matches case-insensitively', () => {
    expect(matchedDomainSectors(['FinTech'])).toEqual(['Payments & Transactions'])
  })

  it('keeps targetDomains as the flattened set of every sector keyword, for parser.ts keyword matching', () => {
    expect(RAJ_PROFILE.targetDomains).toEqual(expect.arrayContaining(['fintech', 'banking', 'kyc', 'enterprise systems']))
  })
})
