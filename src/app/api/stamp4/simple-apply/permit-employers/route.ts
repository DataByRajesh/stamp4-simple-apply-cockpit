import { checkAccessSecret, unauthorizedResponse } from '@/lib/stamp4/simple-apply/checkAccessSecret'
import { permitEmployerUniverse, type PermitEmployerTier } from '@/lib/stamp4/simple-apply/permitEmployers'

const TIERS = new Set<PermitEmployerTier>(['aligned', 'review', 'evidence'])
export async function GET(request: Request) {
  if (!checkAccessSecret(request)) return unauthorizedResponse()
  const params = new URL(request.url).searchParams
  const query = params.get('q')?.trim().toLowerCase() ?? ''
  const requestedTier = params.get('tier') as PermitEmployerTier | null
  const tier = requestedTier && TIERS.has(requestedTier) ? requestedTier : null
  const limit = Math.min(100, Math.max(1, Number(params.get('limit')) || 40))
  const matching = permitEmployerUniverse.employers.filter(
    (employer) => (!query || employer.name.toLowerCase().includes(query)) && (!tier || employer.tier === tier),
  )
  const tierCounts = permitEmployerUniverse.employers.reduce<Record<PermitEmployerTier, number>>(
    (counts, employer) => ({ ...counts, [employer.tier]: counts[employer.tier] + 1 }),
    { aligned: 0, review: 0, evidence: 0 },
  )
  return Response.json({ metadata: permitEmployerUniverse.metadata, tierCounts, total: matching.length, employers: matching.slice(0, limit) })
}
