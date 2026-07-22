import data from '@/data/ireland-permit-employers-2026.json'

export type PermitEmployerTier = 'aligned' | 'review' | 'evidence'
export interface PermitEmployer {
  name: string
  permitCount: number
  permitRank: number
  relevanceScore: number
  tier: PermitEmployerTier
  reasons: string[]
}
export const permitEmployerUniverse = data as {
  metadata: { sourceYear: number; sourcePage: string; generatedAt: string; method: string; disclaimer: string; totalEmployersInSource: number }
  employers: PermitEmployer[]
}
