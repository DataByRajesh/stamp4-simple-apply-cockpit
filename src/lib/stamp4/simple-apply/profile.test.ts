import { describe, expect, it } from 'vitest'
import { matchedDomainSectors, RAJ_PROFILE, type CareerMobilityProfile } from './profile'
import { parseJobDescription } from './parser'
import { scoreJob } from './scoring'

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

describe('career profile parameterization', () => {
  const customProfile: CareerMobilityProfile = {
    ...RAJ_PROFILE,
    yearsExperience: 8,
    targetRoleLane: ['climate data scientist'],
    adjacentRoleLane: [],
    coreSkills: ['python'],
    targetDomains: ['climate'],
    positiveLocationSignals: ['oslo'],
  }

  it('parses skills, domains and locations from the supplied profile', () => {
    const parsed = parseJobDescription('Job title: Climate Data Scientist\nLocation: Oslo\nRequirements: Python and climate modelling.', customProfile)
    expect(parsed.requiredSkills).toContain('python')
    expect(parsed.domainKeywords).toContain('climate')
    expect(parsed.location).toContain('oslo')
  })

  it('scores the supplied role lane instead of Raj profile defaults', () => {
    const parsed = parseJobDescription('Job title: Climate Data Scientist\nLocation: Oslo\nRequirements: Python.', customProfile)
    expect(scoreJob(parsed, customProfile).roleFit).toBe(5)
    expect(scoreJob(parsed).roleFit).toBe(0)
  })
})
