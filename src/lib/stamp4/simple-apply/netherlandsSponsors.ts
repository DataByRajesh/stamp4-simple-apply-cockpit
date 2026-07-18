import data from '@/data/netherlands-recognised-sponsors-2026-07.json'
export type RecognisedSponsorTier = 'aligned' | 'review' | 'evidence'
export interface RecognisedSponsor {
  name: string
  kvkNumber: string
  relevanceRank: number
  relevanceScore: number
  tier: RecognisedSponsorTier
  reasons: string[]
}
export const netherlandsSponsorUniverse = data as {
  metadata: { country: string; registerUpdated: string; sourcePage: string; generatedAt: string; method: string; disclaimer: string; totalRecognisedSponsors: number }
  employers: RecognisedSponsor[]
}
