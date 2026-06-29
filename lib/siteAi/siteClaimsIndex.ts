/**
 * Site claims index — loaded from paradigm-threat-files/site-claims.json at runtime.
 *
 * Source of truth: ../paradigm-threat-files/site-claims.json (published on FILES mirrors).
 */
export {
  getSiteClaimsIndex,
  getSiteClaimsIndexCached,
  getSiteClaimById,
  prefetchSiteClaims,
  resetSiteClaimsCache,
  setSiteClaimsIndexOverride,
  loadSiteClaimsFromFilesystem,
} from '@/lib/siteAi/siteClaimsStore'
