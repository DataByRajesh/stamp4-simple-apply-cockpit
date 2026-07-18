import data from '@/data/germany-target-employers-2026-07.json'
export type GermanyEmployerTier = 'aligned' | 'review' | 'evidence'
export interface GermanyEmployer {
  name: string
  activeRoleCount: number
  titles: string[]
  locations: string[]
  sourceRefs: string[]
  latestPublished: string
  relevanceRank: number
  relevanceScore: number
  tier: GermanyEmployerTier
  reasons: string[]
}
export const germanyEmployerUniverse = data as {
  metadata: { country: string; snapshotDate: string; sourcePage: string; blueCardSource: string; blueCardGeneralSalary2026: number; blueCardReducedSalary2026: number; method: string; disclaimer: string; jobsAnalysed: number; employersAfterExclusions: number }
  employers: GermanyEmployer[]
}
