import type { SiteClaimEntry } from '@/lib/siteAi/siteClaimsTypes'

export function getSiteClaimByIdFromList (claims: SiteClaimEntry[], id: string): SiteClaimEntry | undefined {
  return claims.find((c) => c.id === id)
}
