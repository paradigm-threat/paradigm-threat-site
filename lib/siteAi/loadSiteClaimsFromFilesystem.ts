import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { parseSiteClaimsJson } from '@/lib/siteAi/parseSiteClaims'
import type { SiteClaimEntry } from '@/lib/siteAi/siteClaimsTypes'

const FIXTURE_PATHS = [
  join(process.cwd(), '../paradigm-threat-files/site-claims.json'),
  join(process.cwd(), 'data/site-claims.json'),
]

/** Node/tests only — not imported from client bundles. */
export function loadSiteClaimsFromFilesystem (): SiteClaimEntry[] | null {
  for (const path of FIXTURE_PATHS) {
    if (!existsSync(path)) continue
    try {
      const raw = JSON.parse(readFileSync(path, 'utf8')) as unknown
      return parseSiteClaimsJson(raw)
    } catch {
      continue
    }
  }
  return null
}
